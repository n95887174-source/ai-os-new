# Канонические счётчики SuperAgents OS

_Источник истины для всех счётчиков в документации. Обновлять при изменениях._

## Принцип

Все README.md, AGENTS.md, STRUCTURE.md берут числа отсюда. Если счётчик устарел — обнови его здесь, потом в документах.

## Текущие значения (v4.5.0 — verified 05 July 2026)

| Метрика                | Значение               | Комментарий                                                                                                                                                     |
| ---------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Контракты (interfaces) | 123                    | `src/kernel/contracts/*.ts`, без index.ts                                                                                                                       |
| Сервисы (kernel)       | 277                    | `src/kernel/services/**/*.ts` без тестов (−13 мёртвых сервисов удалены)                                                                                         |
| UI панели              | 145                    | `src/components/**/*Panel*.tsx` без тестов                                                                                                                      |
| LLM адаптеры           | 7                      | gemini, openrouter, nvidia, openai-compatible, cerebras, cloudflare, mock                                                                                       |
| Декораторы             | 12                     | circuit-breaker, retry, cache, rate-limit, priority-queue, logging, semantic-router, canary-router, fallback, compress-route, cost-manager, metrics             |
| Провайдеры             | 25 имён / 7 реализаций | openai-compatible адаптер покрывает 15+ провайдеров (groq, openai, together, fireworks, deepseek, mistral, cohere, azure, huggingface, ollama, lmstudio, и др.) |
| Ивенты                 | 198                    | См. event-registry.ts (+70 новых событий добавлено в фазах Beta-Gamma-Delta)                                                                                    |
| Тесты                  | 46                     | `*.test.ts` и `*.test.tsx` в src/                                                                                                                               |
| Версия                 | v4.5.0                 | package.json                                                                                                                                                    |
| TypeScript strict      | ✅ Да                  | tsconfig.json strict: true                                                                                                                                      |
| Circular deps          | ✅ 0                   | 14 циклов устранены — madge чист                                                                                                                                |
| Raw event strings      | ✅ 0                   | 100% EVENTS.* — все 131 raw string устранены                                                                                                                    |
| Inline styles          | ✅ 0                   | Все 6377 violations устранены — 100% common.ts                                                                                                                  |
| as any в kernel        | 0                      | Все устранены                                                                                                                                                   |
| Pre-existing TS errors | 0                      | `tsc --noEmit` — 0 ошибок                                                                                                                                       |
| ESLint errors          | ❓                     | Не проверялись (долгий запуск на Windows)                                                                                                                       |

## Как обновлять

1. Измени значение здесь
2. Проверь README.md, AGENTS.md, STRUCTURE.md на то же число
3. Обнови если отличается
