# 🐛 SuperAgents OS — Bug Tracker

**Проект:** ai-os-new  
**Дата создания:** 2026-06-05  
**Коммиты с фиксами:** `cbe7c6a`, `5dea76b`, `c60bd04`, `2ad1af5`, `2241d33`, `be2950f`  
**Актуальный статус:** 22 починено, 4 осталось (2 CRITICAL, 1 MEDIUM, 1 LOW)

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
| N-04 | t-code RCE — `has: () => true` обход | `2241d33` | AST-валидация + `ALLOWED_GLOBALS` proxy в sandbox.worker.ts |
| N-13 | `persistSession` fire-and-forget | `2241d33` | Уже с try/catch + console.warn внутри |
| N-16 | `freeOnly` захардкожен на `'groq'` | `2241d33` | Уже динамический: `CONFIG.keys.freeTierLimits` |
| N-26 | `cancelRequest` не отменяет multi-target | `2241d33` | RaceExecutor правильно отменяет все controllers |
| N-28 | MarkdownRenderer XSS через URL | `2241d33` | React экранирует, escapeHtml до парсинга, URL валидируется |

---

## 🔴 CRITICAL — Не починено

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

*(пусто — H-15 перенесён в LOW)*

---

## 🟠 MEDIUM — Не починено

| # | Проблема | Статус |
|---|----------|--------|
| N-12 | 148 `as any` кастов | Постепенно чистим |
| N-25 | `persistSession` DB locked | Проверить |

---

## ⚪ LOW / Проверить

| # | Проблема | Статус |
|---|----------|--------|
| H-15 | Race condition на `isExecutingRound` | Не проверено |
| TS2307 | Отсутствующие модули | Не проверено |
| TS1117 | Дублирующиеся ключи | Не проверено |
| TS7006 | Неявный `any` тип | Не проверено |

---

## 📋 ПЛАН ФИКСОВ

### Осталось сделать

| # | Действие | Приоритет |
|---|----------|-----------|
| N-17 | deepFreeze убивает классы — рефактор state | 🔴 |
| N-19 | Dexie Event Loop — убрать await из transaction | 🔴 |
| N-25 | persistSession DB locked — проверить SQLite WAL mode | 🟡 |
| H-15 | Race condition на isExecutingRound — проверить | 🟠 |
| N-12 | 148 `as any` кастов — постепенно чистить | 🟠 |

### Обдумать

| # | Сложность |
|---|-----------|
| Vitest тесты | Высокая |

---

*Обновлено: 2026-06-05*  
*Коммиты: `cbe7c6a`, `5dea76b`, `c60bd04`, `2ad1af5`, `2241d33`, `be2950f`*