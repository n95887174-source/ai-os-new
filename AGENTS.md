# SuperAgents OS — Agent Guide

## Project Overview

Autonomous, event-driven multi-agent runtime. v4.5.0 — 162 contracts, 346 services, 12 LLM adapters, 75+ UI panels.

## Workflow Convention

Когда пользователь пишет **«продолжать»** (continue):

1. Открыть `AGENTS.md` → найти следующую задачу в **Current Session**
2. Выполнить задачу
3. Записать что сделано в `AGENTS.md` → Changes
4. Перейти к следующей задаче, пока пользователь не скажет стоп

## Key Principles

1. **Events First** — all communication through EventBus (`src/kernel/event-bus.ts`)
2. **No Globals in Kernel** — only DI constructor injection (`src/kernel/container.ts`)
3. **Dependency Rule** — UI → Application → Kernel → Infrastructure (kernel never imports UI)
4. **Contracts at Boundaries** — interfaces in `src/kernel/contracts/`, implementations in `src/kernel/services/`
5. **No circular deps** — services depend on contracts, not other services

## Architecture Layers

- `src/kernel/contracts/` — 162 interfaces + types
- `src/kernel/services/` — 346 implementations
- `src/kernel/events/` — event names + payloads
- `src/kernel/state/` — state shapes (19 files)
- `src/llm/` — provider adapters + decorators (12 adapters)
- `src/components/` — React UI (75+ panels)
- `src/stores/` — Zustand stores
- `docs/` — architecture docs (38 files, RU/EN)

## Code Rules

- **TypeScript** strict mode
- **No React/DOM** imports in kernel
- **No `any`** unless unavoidable (type with `as any` + comment)
- **Tests** next to source: `*.test.ts`
- Use `Result<T,E>` from `contracts/results.ts` for fallible operations
- All mutation methods accept optional `tx?: ITransaction`

## Commands

```bash
npm run dev                # dev server
npm run typecheck:fast     # fast typecheck (src/ only)
npm run typecheck          # full typecheck (project references, ~2min)
npm run build              # production build
npm run test               # vitest
npm run lint               # eslint
npm run check:circular-kernel  # circular deps check
```

## Current Session — Стабилизация и освоение (v4.5.0 → v4.6.0)

### Цель

Всё починить, настроить, протестировать, научиться использовать.

### План

| #   | Задача                                                     | Статус  |
| --- | ---------------------------------------------------------- | ------- |
| 1   | **Typecheck** — диагностировать и ускорить сборку          | 🟢 Done |
| 2   | **AGENTS.md** — обновить под новый этап                    | 🟢 Done |
| 3   | **Тесты** — поднять покрытие (EventBus, Container, Debate) | 🟢 Done |
| 4   | **Интеграционные тесты** — e2e: дебаты, LLM, memory        | ⚪      |
| 5   | **Аудит конфигурации** — DI регистрация, dead-code         | 🟢 Done |
| 6   | **DEV_QUICKSTART.md** — документация для быстрого старта   | 🟢 Done |

### Changes

| #   | Что сделано                                                          | Когда      |
| --- | -------------------------------------------------------------------- | ---------- |
| 1   | Диагностика typecheck: 1420 файлов, ~112s, 0 circular deps, 0 ошибок | 2026-07-21 |
| 2   | Добавлен `typecheck:fast` для быстрой проверки                       | 2026-07-21 |
| 3   | AGENTS.md очищен и переписан под новый этап                          | 2026-07-21 |
| 4   | Container.test.ts — 36 тестов (DI, lifecycle, circular deps)         | 2026-07-21 |
| 5   | Починены 19 pre-existing test failures                               | 2026-07-21 |
| 6   | Аудит DI: 140+ сервисов, 12 фаз, 0 dead-imports                      | 2026-07-21 |
| 7   | Удалены 2 truly dead файла + 2 пустые директории                     | 2026-07-21 |
| 8   | DEV_QUICKSTART.md — документация для быстрого старта                 | 2026-07-21 |
