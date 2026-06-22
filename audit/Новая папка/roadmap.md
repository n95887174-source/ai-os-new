Вот тебе **чистая, сжатая, “анти-раздувание” версия задания**, которую ты можешь просто скопировать агентам.

Она специально сделана так, чтобы:

* не дать им “построить новый мир”
* заставить использовать существующее
* ограничить масштаб
* дать быстрый результат (MVP live view)

---

# 📌 TASK: Live Debate View (MINIMAL OVERLAY)

## 🎯 Цель

Добавить **live визуализацию уже существующего Debate Engine** без изменения архитектуры.

Это НЕ новая система.
Это UI-оверлей поверх уже работающего event stream.

---

# 🚫 ЖЁСТКИЕ ОГРАНИЧЕНИЯ (ОБЯЗАТЕЛЬНО)

Запрещено:

* ❌ создавать новые системы (roles/scenarios/engines)
* ❌ рефакторить DebateEngine
* ❌ менять бизнес-логику дебатов
* ❌ добавлять новые абстракции или архитектурные слои
* ❌ усложнять store или event system

Разрешено только:

* ✅ использовать существующие события (`agent:thinking`, `agent:responded`, `agent:chunk`)
* ✅ использовать `useDebateLiveStore`
* ✅ использовать `DebateEngine.getSession()`
* ✅ использовать `AgentAvatarService`

---

# 🎯 ОБЪЁМ РАБОТЫ (MVP ONLY)

Сделать **минимальный Live Debate View**:

---

## 1. Circular Layout (обязательно)

* Агенты отображаются по кругу
* Судья — в центре
* Позиции вычисляются через простую геометрию (sin/cos)

📌 НЕ делать сложных graph/layout систем

---

## 2. Judge Center

* Отдельный центр круга
* Показывает судью
* Подсветка при `judge:evaluating`

---

## 3. Active Speaker Highlight

Определение активного агента:

Приоритет:

1. `streamingContent`
2. `currentThinking`

UI эффект:

* scale up
* glow
* opacity остальных ↓
* z-index вверх

---

## 4. Event-driven UI

UI обновляется ТОЛЬКО через:

* `useDebateLiveStore`

Никакой локальной логики engine.

---

## 5. One Component Entry Point

Создать:

```
DebateCircularView.tsx
```

Он должен:

* подписываться на store
* получать участников дебата
* рендерить:

  * CircularLayout
  * JudgeCenter
  * SpeakerNodes

---

# 🧩 УПРОЩЁННАЯ АРХИТЕКТУРА

НЕ создавать много файлов.

Допустимо максимум:

* DebateCircularView.tsx
* CircularLayout.tsx
* SpeakerNode.tsx
* JudgeCenter.tsx
* useActiveSpeaker.ts (опционально)

---

# 🎨 UI ТРЕБОВАНИЯ (минимальные)

* inline styles или existing `common.ts`
* Framer Motion можно использовать только для:

  * scale
  * opacity
  * position transition
* без сложных animation systems

---

# ⚡ SUCCESS CRITERIA

Считается выполненным, если:

* видно круг агентов
* есть центральный судья
* один агент подсвечивается при речи
* UI реагирует на live события
* дебат выглядит “живым”

---

# ❗ ВАЖНОЕ ПРАВИЛО

👉 НЕ оптимизировать
👉 НЕ расширять
👉 НЕ проектировать “future system”

Только:

> “make existing debate visible in real-time”

---

# 🚀 END RESULT

Live Debate View должен давать ощущение:

> “я вижу живой процесс мышления системы”

---

Если хочешь, следующим шагом я могу тебе сделать ещё более жёсткую версию:

👉 “ультра-safe prompt”, который вообще почти гарантирует, что агенты не начнут раздувать архитектуру (это часто полезно в больших системах).
