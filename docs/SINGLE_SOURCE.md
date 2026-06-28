# Канонические счётчики SuperAgents OS

*Источник истины для всех счётчиков в документации. Обновлять при изменениях.*

## Принцип

Все README.md, AGENTS.md, STRUCTURE.md берут числа отсюда. Если счётчик устарел — обнови его здесь, потом в документах.

## Текущие значения (v4.5.0)

| Метрика | Значение | Комментарий |
|---------|----------|-------------|
| Контракты (interfaces) | 65 | `src/kernel/contracts/*.ts`, без index.ts |
| Сервисы (kernel) | 213 | `src/kernel/services/**/*.ts` без тестов |
| UI панели | 79 | `src/components/**/*Panel*.tsx` без тестов |
| LLM адаптеры | 8 | gemini, openrouter, nvidia, openai-compatible, cerebras, cloudflare, mock, embeddings |
| Декораторы | 11 | circuit-breaker, retry, cache, rate-limit, priority-queue, logging, semantic-router, canary-router, fallback, compress-route, cost-manager |
| Провайдеры | 25 имён / 8 реализаций | openai-compatible адаптер покрывает 15+ провайдеров (groq, openai, together, fireworks, deepseek, mistral, cohere, azure, huggingface, ollama, lmstudio, и др.) |
| Ивенты | 310 | См. event-registry.ts |
| Тесты | 16 | `*.test.ts` и `*.test.tsx` в src/ |
| Версия | v4.5.0 | package.json |
| TypeScript strict | ✅ Да | tsconfig.json strict: true |
| Circular deps | ❌ Нет | Проверено madge |
| Raw event strings | ❌ Нет | 100% через EVENTS.* константы |
| Inline styles | ❌ Нет | 100% через common.ts константы |
| as any в kernel | 0 | Все устранены |
| Pre-existing TS errors | 0 | `tsc --noEmit` — 0 ошибок |
| ESLint errors | 0 | Все устранены |

## Как обновлять

1. Измени значение здесь
2. Проверь README.md, AGENTS.md, STRUCTURE.md на то же число
3. Обнови если отличается
