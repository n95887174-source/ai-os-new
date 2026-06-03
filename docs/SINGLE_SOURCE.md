# Канонические счётчики SuperAgents OS

*Источник истины для всех счётчиков в документации. Обновлять при изменениях.*

## Принцип

Все README.md, AGENTS.md, STRUCTURE.md берут числа отсюда. Если счётчик устарел — обнови его здесь, потом в документах.

## Текущие значения (v4.5.0)

| Метрика | Значение | Комментарий |
|---------|----------|-------------|
| Контракты (interfaces) | 64 | `src/kernel/contracts/*.ts` (без index.ts) |
| Сервисы (kernel) | 100+ | `src/kernel/services/**/*.ts` |
| UI панели | 75+ | `src/components/**/*Panel*.tsx` |
| LLM адаптеры | 8 | gemini, openrouter, nvidia-nim, openai-compatible, cerebras, cloudflare, mock, embeddings |
| Декораторы | 12 | circuit-breaker, retry, cache, rate-limit, priority-queue, logging, metrics, semantic-router, canary-router, fallback, compress-route, cost-manager |
| Провайдеры | 24+ в адаптер-фабрике | gemini, openrouter, nvidia, groq, openai, cerebras, cloudflare, azure, together, fireworks, deepseek, ollama, lmstudio, huggingface, и др. |
| Ивенты | 115+ | См. docs/events.md и event-names.ts |
| Тесты | ~90 | `*.test.ts` в src/ |
| Версия | v4.5.0 | package.json |
| TypeScript strict | ✅ Да | tsconfig.json strict: true |
| Circular deps | ❌ Нет | Проверено madge |
| Raw event strings | ❌ Нет | 100% через EVENTS.* константы |
| Inline styles | ❌ Нет | 100% через common.ts константы |
| as any в kernel | 7 | Сознательно (см. код с комментариями) |
| Pre-existing TS errors | 4 | `resumable-stream.ts` — вне скоупа фиксов |

## Как обновлять

1. Измени значение здесь
2. Проверь README.md, AGENTS.md, STRUCTURE.md на то же число
3. Обнови если отличается
