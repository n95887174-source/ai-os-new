# Канонические счётчики SuperAgents OS

_Источник истины для всех счётчиков в документации. Обновлять при изменениях._

## Принцип

Все README.md, AGENTS.md, STRUCTURE.md берут числа отсюда. Если счётчик устарел — обнови его здесь, потом в документах.

## Текущие значения (v4.5.0 — verified 29 June 2026)

| Метрика                | Значение               | Комментарий                                                                                                                                                     |
| ---------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Контракты (interfaces) | 65                     | `src/kernel/contracts/*.ts`, без index.ts                                                                                                                       |
| Сервисы (kernel)       | 212                    | `src/kernel/services/**/*.ts` без тестов                                                                                                                        |
| UI панели              | 77                     | `src/components/**/*Panel*.tsx` без тестов                                                                                                                      |
| LLM адаптеры           | 11                     | gemini, openrouter, nvidia, openai-compatible, cerebras, cloudflare, mock, embeddings + 3                                                                       |
| Декораторы             | 11                     | circuit-breaker, retry, cache, rate-limit, priority-queue, logging, semantic-router, canary-router, fallback, compress-route, cost-manager                      |
| Провайдеры             | 25 имён / 8 реализаций | openai-compatible адаптер покрывает 15+ провайдеров (groq, openai, together, fireworks, deepseek, mistral, cohere, azure, huggingface, ollama, lmstudio, и др.) |
| Ивенты                 | 310                    | См. event-registry.ts                                                                                                                                           |
| Тесты                  | 43                     | `*.test.ts` и `*.test.tsx` в src/                                                                                                                               |
| Версия                 | v4.5.0                 | package.json                                                                                                                                                    |
| TypeScript strict      | ✅ Да                  | tsconfig.json strict: true                                                                                                                                      |
| Circular deps          | ✅ 0                   | 14 циклов устранены — madge чист                                                                                                                                |
| Raw event strings      | ✅ 0                   | 128 violations устранены — 100% EVENTS.*                                                                                                                        |
| Inline styles          | ✅ 0                   | 6377 violations устранены — 100% common.ts                                                                                                                      |
| as any в kernel        | 0                      | Все устранены (1 в .test.ts — допустимо)                                                                                                                        |
| Pre-existing TS errors | 0                      | `tsc --noEmit` — 0 ошибок                                                                                                                                       |
| ESLint errors          | ❓                     | Не проверялись (долгий запуск на Windows)                                                                                                                       |

## Как обновлять

1. Измени значение здесь
2. Проверь README.md, AGENTS.md, STRUCTURE.md на то же число
3. Обнови если отличается
