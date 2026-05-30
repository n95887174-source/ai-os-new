# Аудит адаптеров и обёрток API — баги, ошибки, улучшения

**Проект:** ai-os-new  
**Дата:** 2026-05-30  
**Область:** `src/llm/` (адаптеры, декораторы, фабрики, HTTP-клиент, SSE-парсер)  
**Файлов проанализировано:** 37

---

## Сводка

| Критичность | Количество |
|-------------|-----------|
| 🔴 CRITICAL | 6 |
| 🟠 HIGH | 10 |
| 🟡 MEDIUM | 9 |
| 🔵 LOW | 8 |
| **Итого** | **33** |

---

## 🔴 CRITICAL — Баги, приводящие к некорректному поведению в runtime

### C-1. PriorityQueue: повреждение индексов при batch-splice

**Файл:** `src/llm/decorators/priority-queue.ts:90-93`

```typescript
for (let i = 0; i < batchSize; i++) {
  const idx = this.sendQueue.indexOf(availableItems[i]);
  batch.push(this.sendQueue.splice(idx, 1)[0]);
}
```

**Проблема:** После первого `splice(idx, 1)` все последующие элементы сдвигаются, и `indexOf` для `availableItems[i+1]` вернёт неправильный индекс. Классическая ошибка «splice в цикле по тому же массиву». В batch попадёт не тот элемент, или `splice` вырежет элемент со сдвигом.

**Исправление:**
```typescript
// Собрать все индексы сначала, затем удалить с конца
const indices = availableItems.slice(0, batchSize)
  .map(item => this.sendQueue.indexOf(item));
indices.sort((a, b) => b - a); // обратный порядок
for (const idx of indices) {
  batch.push(this.sendQueue.splice(idx, 1)[0]);
}
batch.reverse(); // восстановить исходный порядок
```

**То же самое** наблюдается в `processStreamQueue()` (строки 148-155).

---

### C-2. NvidiaNIMAdapter: 429 в streamMessage бросает LLMError вместо RetryableError

**Файл:** `src/llm/nvidia/nvidia-nim-adapter.ts:125`

```typescript
// doSendMessage (строка 95) — правильно:
throw new RetryableError(`Rate limited by NIM: ...`, this.id);

// doStreamMessage (строка 125) — ОШИБКА:
throw new LLMError(`Rate limited by NIM: ...`, this.id, 429);
```

**Проблема:** При стриминге ответ 429 бросает `LLMError`, а не `RetryableError`. Это означает, что `RetryDecorator` и `CircuitBreakerDecorator` не будут ретраить при rate limit в стриминге, что приводит к немедленному провалу запроса.

**Исправление:** Заменить на `RetryableError` в `doStreamMessage`.

---

### C-3. BaseDecorator: batchSendMessage/batchStreamMessage — небезопасный non-null assertion

**Файл:** `src/llm/core/base-decorator.ts:44, 48`

```typescript
batchSendMessage?(requests: ...): Promise<ProviderResponse[]> {
  return this.#inner.batchSendMessage!(requests);  // ← ! при optional
}
batchStreamMessage?(requests: ...): Promise<void> {
  return this.#inner.batchStreamMessage!(requests);  // ← ! при optional
}
```

**Проблема:** Если внутренний адаптер не реализует `batchSendMessage`, вызов `!` приведёт к `TypeError: this.#inner.batchSendMessage is not a function` в runtime. TypeScript не предупредит об этом из-за `!`.

**Исправление:**
```typescript
batchSendMessage?(requests: ...): Promise<ProviderResponse[]> {
  if (!this.#inner.batchSendMessage) {
    throw new Error(`${this.constructor.name}: inner adapter does not support batch send`);
  }
  return this.#inner.batchSendMessage(requests);
}
```

---

### C-4. CircuitBreaker: TOCTOU race condition на inFlightHalfOpen

**Файл:** `src/llm/decorators/circuit-breaker.ts:88-93`

```typescript
const isHalfOpen = circuitState === 'half-open';
if (isHalfOpen) {
  if (this.inFlightHalfOpen >= this.config.halfOpenMaxRequests) {
    throw new LLMError(`...max concurrent test requests reached`, ...);
  }
  this.inFlightHalfOpen++;  // ← несколько конкурентных вызовов пройдут проверку
}
```

**Проблема:** В асинхронной среде несколько запросов могут одновременно пройти проверку `inFlightHalfOpen >= halfOpenMaxRequests` до того, как любой из них инкрементирует счётчик. При `halfOpenMaxRequests=1` в half-open проникнут 2+ запроса.

**Исправление:** Инкремент делать атомарно до проверки:
```typescript
if (isHalfOpen) {
  this.inFlightHalfOpen++;
  if (this.inFlightHalfOpen > this.config.halfOpenMaxRequests) {
    this.inFlightHalfOpen--;
    throw new LLMError(...);
  }
}
```

---

### C-5. FlyweightConfig: `tools` не включены в ключ дедупликации

**Файл:** `src/llm/core/flyweight.ts:13-19`

```typescript
const key = JSON.stringify({
  temp: options.temperature,
  tokens: options.maxOutputTokens,
  stop: options.stopSequences,
  format: options.responseFormat,
  safety: options.safetySettings,
  // ← tools НЕ включены!
});
```

Но при этом `tools` сохраняются в immutable-объект (строка 36): `tools: options.tools`. Это значит, что два запроса с одинаковыми параметрами, но **разными инструментами**, получат один и тот же flyweight-объект с неверным набором `tools`.

**Исправление:** Добавить `tools` в ключ (или исключить из immutable-объекта, т.к. tools — extrinsic state).

---

### C-6. GeminiRequestBuilder: нарушение чередования user/model в Gemini API

**Файл:** `src/llm/gemini/gemini-request-builder.ts:110`

```typescript
contents.unshift({ role: 'user', parts: systemParts });
```

**Проблема:** System-сообщения добавляются как `role: 'user'` в начало `contents`. Но сразу после них идёт первое реальное user-сообщение. Это создаёт два подряд идущих `user`-поворота, что для некоторых Gemini-моделей (особенно gemini-2.5-flash) вызывает ошибку 400: «Consecutive user turns are not allowed».

**Исправление:** Объединить system-сообщение с первым user-сообщением:
```typescript
if (systemParts.length > 0 && contents.length > 0 && contents[0].role === 'user') {
  contents[0].parts = [...systemParts, ...contents[0].parts];
} else if (systemParts.length > 0) {
  contents.unshift({ role: 'user', parts: systemParts });
}
```

---

## 🟠 HIGH — Серьёзные ошибки, влияющие на корректность

### H-1. OpenAiCompatibleAdapter: не извлекает finishReason и toolCalls

**Файл:** `src/llm/openai-compatible/openai-compatible-adapter.ts:67-70`

```typescript
return {
  content: data.choices?.[0]?.message?.content ?? '',
  tokens: data.usage?.total_tokens ?? 0,
  // ← нет finishReason, нет toolCalls
};
```

**Проблема:** Все ответы через OpenAI-совместимые адаптеры (groq, openai, together, fireworks, deepseek, mistral, cohere, azure, huggingface, scaleway, blackbox, cometapi, github) теряют `finishReason` и `toolCalls`. Это 13+ провайдеров.

**Исправление:** Добавить extraction finishReason и toolCalls из ответа.

---

### H-2. OpenAiCompatibleAdapter: стриминг не эмитит финальные метаданные

**Файл:** `src/llm/openai-compatible/openai-compatible-adapter.ts:120-130`

```typescript
await parseSSEStream(res, (chunk) => onChunk(chunk), (parsed) => {
  // ... extract delta.content
  // ← нет onChunk('', { finishReason, usage }) в конце!
}, undefined, { signal });
```

**Проблема:** В отличие от OpenRouter и NVIDIA адаптеров, которые эмитят `onChunk('', { finishReason, usage })` после завершения стрима, OpenAI-compatible этого не делает. Потребители стрима (LLMClient, CostManager, MetricsDecorator) не могут определить момент завершения и получить информацию о токенах.

---

### H-3. OpenAiCompatibleAdapter: 401/403 не выбрасывают AuthError

**Файл:** `src/llm/openai-compatible/openai-compatible-adapter.ts:46-63`

Все non-200 ответы (включая 401/403) выбрасывают `LLMError`. Но `FallbackDecorator` проверяет `e instanceof AuthError` для принятия решения о фатальности ошибки. Если 401 не выбрасывает `AuthError`, fallback будет пытаться использовать запасной провайдер с тем же неверным ключом — бессмысленная трата.

---

### H-4. CloudflareAdapter: нет обработки 429 как RetryableError

**Файл:** `src/llm/cloudflare/cloudflare-adapter.ts:68-74, 110-117`

Ни `doSendMessage`, ни `doStreamMessage` не обрабатывают 429 как `RetryableError`. Это значит, что rate limit Cloudflare не будет ретраиться, и CircuitBreaker не учтёт 429 как временную ошибку.

---

### H-5. CacheDecorator: семантический кэш игнорирует контекст conversation

**Файл:** `src/llm/decorators/cache-decorator.ts:91-109`

Семантическое совпадение проверяет только `apiKeyHash`, `model` и embedding последнего user-сообщения. Но System prompt и предыдущие сообщения разговора НЕ учитываются. Запрос «Что такое 2+2?» с system-prompt «Ты математик» и «Ты поэт» получит один и тот же закэшированный ответ.

**Исправление:** Включить хэш system-сообщений в условие семантического совпадения.

---

### H-6. LLMClient.chat(): spread finalMeta может перезаписать поля

**Файл:** `src/llm/facade/llm-client.ts:85-90`

```typescript
return {
  content,
  latency,
  tokens: tokensFromMeta || estimateTokenCount(content),
  ...finalMeta,  // ← может содержать finishReason, usage, и другие поля
};
```

**Проблема:** `...finalMeta` может содержать поле `tokens` (из `usage.total_tokens`), которое перезапишет вычисленное значение. Также в `finalMeta` может быть `content`, что перезапишет накопленный `content` из стрима.

**Исправление:** Явно выбрать нужные поля вместо spread:
```typescript
return {
  content,
  latency,
  tokens: tokensFromMeta || estimateTokenCount(content),
  finishReason: finalMeta?.finishReason as string | undefined,
  toolCalls: (finalMeta?.toolCalls as ToolCall[] | undefined),
};
```

---

### H-7. GeminiResponseMapper: ToolCall ID через Math.random() — недетерминированность

**Файл:** `src/llm/gemini/gemini-response-mapper.ts:45`

```typescript
id: `call_${Math.random().toString(36).substring(2, 11)}`,
```

**Проблема:** При повторной обработке того же ответа (кэш, ретрай) генерируются разные ID. Это ломает отладку и может вызвать рассинхрон в multi-turn диалогах с tool calls.

**Исправление:** Использовать детерминированный ID на основе контента: хэш от `(name + args)` или порядковый индекс.

---

### H-8. SSE Parser: утечка bodyReader при idle timeout

**Файл:** `src/llm/http/sse-parser.ts:34-37`

```typescript
if (idleTimeout > 0 && Date.now() - lastChunkTime > idleTimeout) {
  const err = new LLMError(`SSE idle timeout...`);
  controller.error(err);
  return;  // ← bodyReader не отменён!
}
```

**Проблема:** При idle timeout `bodyReader.cancel()` не вызывается, и соединение остаётся открытым. Это утечка сетевых ресурсов.

**Исправление:** Добавить `bodyReader.cancel()` перед `controller.error()`.

---

### H-9. AdapterFactory: Azure и GitHub используют одинаковый URL

**Файл:** `src/llm/registry/adapter-factory.ts:101-111`

```typescript
case 'github':
  adapter = new OpenAiCompatibleAdapter('github', 'https://models.inference.ai.azure.com', true);
case 'azure':
  adapter = new OpenAiCompatibleAdapter('azure', 'https://models.inference.ai.azure.com', true);
```

**Проблема:** Azure OpenAI Service использует формат `https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}/`, а не GitHub Models endpoint. Пользователи Azure не смогут подключиться.

---

### H-10. BaseDecorator.streamMessage(): проверка опциональности в runtime

**Файл:** `src/llm/core/base-decorator.ts:23`

```typescript
async streamMessage(...): Promise<void> {
  if (!this.#inner.streamMessage) throw new Error(`${this.constructor.name}: inner adapter does not support streaming`);
  return this.#inner.streamMessage(...);
}
```

**Проблема:** Метод `streamMessage` в `BaseDecorator` не опциональный (нет `?`), но проверяет опциональность внутреннего адаптера в runtime. Вызывающая сторона не получает TypeScript-предупреждения. Каждый декоратор в стеке добавляет свою проверку, создавая до 6+ ненужных проверок на каждый вызов.

**Исправление:** Либо сделать `streamMessage` опциональным в декораторе (согласовать с интерфейсом), либо убрать проверку и документировать, что декораторы поддерживают только streaming-адаптеры.

---

## 🟡 MEDIUM — Проблемы, влияющие на производительность или стабильность

### M-1. CostManager: checkBudget — O(n) на каждый запрос

**Файл:** `src/llm/decorators/cost-manager.ts:83-84`

`checkBudget()` фильтрует все записи (до 100 000) три раза (daily, weekly, monthly) на каждый запрос, и вызывается дважды (до и после). Итого до 600 000 итераций на запрос при полной загрузке.

**Исправление:** Использовать скользящее окно с running sum или периодическую очистку записок старше месяца.

---

### M-2. ModelCache (Gemini): утечка таймеров при отсутствии destroy()

**Файл:** `src/llm/gemini/gemini-model-validator.ts:9`

`modelCache` — модульный singleton. Его `refreshTimers` (setTimeout) создаются при каждом обращении к новому apiKey, но `destroy()` нужно вызывать явно. При hot-reload в dev-режиме таймеры накапливаются.

**Исправление:** Добавить weak-ref или автоматическую очистку в GeminiAdapter.destroy().

---

### M-3. CanaryRouter: O(n) очистка сессий во время запроса

**Файл:** `src/llm/decorators/canary-router.ts:76-82`

При `sessionMap.size > 1000` итерируются все записи для поиска устаревших. Это происходит синхронно в критическом пути запроса.

**Исправление:** Использовать LRU-кэш (Map + двусвязный список) или фоновую очистку.

---

### M-4. CacheDecorator: дублирование hashKey/hashApiKey

**Файл:** `src/llm/decorators/cache-decorator.ts:74-79, 148-153`

Два метода делают одно и то же: SHA-256 хэширование API-ключа. `hashKey` возвращает полный 64-символьный хэш, `hashApiKey` — усечённый до 16 символов. Разная длина может привести к коллизиям в modelCache.

**Исправление:** Унифицировать в один метод с параметром длины.

---

### M-5. BaseLLMAdapter: streamMessage не трекает latency

**Файл:** `src/llm/core/base-adapter.ts:87-106`

`sendMessage` вычисляет `latency: Date.now() - start`, а `streamMessage` — нет. Это нарушает контракт `ProviderResponse.latency` и делает невозможным мониторинг задержки стриминга.

**Исправление:** Добавить отслеживание latency для streamMessage (например, TTFT — Time To First Token).

---

### M-6. GeminiRequestBuilder: tool-сообщения теряют toolCallId

**Файл:** `src/llm/gemini/gemini-request-builder.ts:84-99`

При конвертации `tool`-сообщения в Gemini-формат `toolCallId` теряется. Gemini использует только `name` в `functionResponse`. Если разговор затем конвертируется обратно в OpenAI-формат, `toolCallId` невозможно восстановить.

---

### M-7. MetricsDecorator: avgLatency временно хранит сумму

**Файл:** `src/llm/decorators/metrics-decorator.ts:132, 139`

Поле называется `avgLatency`, но в цикле `byModel[modelKey].avgLatency += r.latency` — это сумма. Только после деления это становится средним. Запутывает отладку и может быть источником ошибок при частичном чтении метрик.

---

### M-8. SSE Parser: double removeEventListener

**Файл:** `src/llm/http/sse-parser.ts:72, 86`

`abortSignal?.removeEventListener('abort', onAbort)` вызывается и в `cancel()` ReadableStream, и в `finally` внешнего reader. Это безопасно, но создаёт лишнюю работу и может маскировать проблемы с жизненным циклом.

---

### M-9. LLMHttpClient.get(): нет обработки 429

**Файл:** `src/llm/http/llm-http-client.ts:66-88`

Метод `get()` обрабатывает 401/403, но НЕ обрабатывает 429. Метод `post()` обрабатывает. Это означает, что `getAvailableModels()` при rate limit получит generic `LLMError` вместо `RetryableError`.

---

## 🔵 LOW — Улучшения кода и мелкие недочёты

### L-1. LoggingDecorator: console.debug/console.error без структурированного логирования

**Файл:** `src/llm/decorators/logging-decorator.ts`

Все логи используют `console.debug`/`console.error`. В production это нефильтруемый шум. Следует использовать настраиваемый logHandler (как в `LoggingMiddleware`).

---

### L-2. MockAdapter.streamMessage(): бросает Error вместо AbortError/DOMException

**Файл:** `src/llm/mock/mock-adapter.ts:87`

```typescript
if (signal?.aborted) throw new Error('AbortError');
```

Должно быть `throw new DOMException('The operation was aborted.', 'AbortError')` или как минимум `throw new AbortError('AbortError')`, чтобы CircuitBreaker и Fallback корректно обрабатывали отмену.

---

### L-3. AdapterFactory: hardcoded список провайдеров дублируется

**Файл:** `src/llm/registry/adapter-factory.ts:51, provider-adapter-registry.ts`

Список из 21 провайдера определён в `isSupported()` и также в `ProviderAdapterRegistry`. При добавлении нового провайдера нужно обновлять оба места.

**Исправление:** Вынести в общий `PROVIDERS` constant.

---

### L-4. RetryDecorator: lastError может быть undefined

**Файл:** `src/llm/decorators/retry-decorator.ts:57`

```typescript
throw lastError ?? new Error('Retry exhausted');
```

`lastError` инициализируется как `undefined`. Хотя в нормальном потоке attempt=0 всегда выполняется, теоретически при `maxRetries < 0` `lastError` останется `undefined`.

---

### L-5. CompressRouteDecorator: потеря полей ChatMessage при компрессии

**Файл:** `src/llm/decorators/compress-route.ts:44-58`

```typescript
const original = messages.map(m => ({ role: m.role, content: m.content }));
// ... compress ...
return compressed.map(m => ({ role: m.role as ChatMessage['role'], content: m.content }));
```

Теряются `name`, `toolCallId`, `toolCalls`. Сжатые сообщения не могут корректно представлять tool-call/dialog.

---

### L-6. SemanticRouter: checkHealth не проверяет все таргеты

**Файл:** `src/llm/decorators/semantic-router.ts:77-81`

Возвращает health мощного адаптера только если быстрый здоров. Но если мощный — error, пользователь не узнает об этом, пока не отправит complex-запрос.

---

### L-7. PriorityQueue: highPriorityStreak не сбрасывается при batch-обработке

**Файл:** `src/llm/decorators/priority-queue.ts:96`

При batch-обработке `highPriorityStreak` инкрементируется на `batch.length`, но при non-highPriority — сбрасывается только на 0, а не учитывает, что часть batch может быть mixed-priority.

---

### L-8. LLMClient.chat(): non-streaming fallback при onChunk без предупреждения

**Файл:** `src/llm/facade/llm-client.ts:93-94`

Если `onChunk` предоставлен, но адаптер не поддерживает `streamMessage`, вызывается `sendMessage` и весь контент отдаётся одним chunk'ом. Вызывающая сторона ожидает прогрессивной доставки.

**Исправление:** Добавить `console.warn` или документировать это поведение.

---

## Рекомендуемые улучшения архитектуры

### 1. Унификация обработки ошибок HTTP

Сейчас каждый адаптер дублирует логику обработки 401/403/429. Предлагается вынести в `LLMHttpClient`:

```typescript
// Общий метод для POST с полной обработкой ошибок
async postWithLLMError(path, body, apiKey, signal): Promise<unknown> {
  // Автоматически конвертирует 401→AuthError, 429→RetryableError, !ok→LLMError
}
```

Все адаптеры (OpenRouter, Cloudflare, OpenAI-compatible) должны использовать его вместо ручного `fetch` + `if (!res.ok)`.

### 2. Типобезопасный декоратор streamMessage

Вместо runtime-проверки `if (!this.#inner.streamMessage)` — добавить generic-параметр или отдельный интерфейс `StreamingLLMProviderAdapter`:

```typescript
interface StreamingLLMProviderAdapter extends LLMProviderAdapter {
  streamMessage: NonNullable<LLMProviderAdapter['streamMessage']>;
}
```

### 3. Канонический формат ToolCall ID

Заменить `Math.random()` на детерминированную генерацию:

```typescript
function generateToolCallId(name: string, args: Record<string, unknown>, index: number): string {
  return `call_${index}_${name}_${simpleHash(JSON.stringify(args))}`;
}
```

### 4. Контекстно-зависимый семантический кэш

Добавить хэш system-prompt в условие совпадения:

```typescript
const systemHash = simpleHash(
  messages.filter(m => m.role === 'system').map(m => m.content).join('\n')
);
// Проверять systemHash в дополнение к apiKeyHash и model
```

### 5. Оптимизация CostManager

Заменить O(n) full-scan на скользящее окно с инкрементальным обновлением:

```typescript
private dailyCost = 0;
private dailyStart = startOfDay(Date.now());
// При каждом запросе: проверить, не наступил ли новый день → сбросить
```

---

## Приоритет исправлений

| Приоритет | ID | Файл | Описание |
|-----------|-----|------|----------|
| P0 | C-1 | priority-queue.ts | Batch-splice corruption |
| P0 | C-2 | nvidia-nim-adapter.ts | 429 → LLMError вместо RetryableError |
| P0 | C-4 | circuit-breaker.ts | Race condition inFlightHalfOpen |
| P0 | C-6 | gemini-request-builder.ts | Consecutive user turns |
| P1 | C-3 | base-decorator.ts | Non-null assertion crash |
| P1 | C-5 | flyweight.ts | Missing tools in key |
| P1 | H-1 | openai-compatible-adapter.ts | No finishReason/toolCalls |
| P1 | H-2 | openai-compatible-adapter.ts | No stream metadata |
| P1 | H-3 | openai-compatible-adapter.ts | No AuthError for 401/403 |
| P1 | H-4 | cloudflare-adapter.ts | No RetryableError for 429 |
| P1 | H-5 | cache-decorator.ts | Semantic cache ignores context |
| P1 | H-6 | llm-client.ts | Spread finalMeta override |
| P2 | H-7 | gemini-response-mapper.ts | Non-deterministic ToolCall ID |
| P2 | H-8 | sse-parser.ts | BodyReader leak on timeout |
| P2 | M-1 | cost-manager.ts | O(n) budget check |
| P2 | M-5 | base-adapter.ts | No stream latency tracking |
| P3 | Остальные | — | См. выше |
