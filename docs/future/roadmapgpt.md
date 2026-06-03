\\\\\\\\Да — это хороший признак того, что фундамент наконец стал устойчивым.

Сейчас у тебя уже не режим аварийного ремонта, а нормальная развилка развития.

И из этих двух направлений я бы ставил приоритет так:

## 1. Сначала — надёжность дебатов / автоматическая ротация ключей

Это даст максимальный эффект для всей системы.

Почему:

Добавлять ещё ключи имеет смысл, когда система умеет **гарантированно переживать отказ любого из них**.

С твоими 19 ключами проблема уже не в количестве.

Проблема теперь в orchestration:

```text
debate request
   ↓
primary key
   ↓ fail?
fallback
   ↓ fail?
next provider
   ↓
continue session transparently
```

Если это работает незаметно для пользователя — система становится реально живой.

---

Что стоит довести здесь:

### sticky session routing

Во время одного дебата держать модель на одном ключе, пока он жив.

При отказе:

```text
same provider → next key
если нет → compatible provider
```

чтобы не было хаотических прыжков.

---

### health decay

Не просто:

```text
key failed = dead
```

а рейтинг:

* healthy
* warm
* degraded
* cooling
* quarantined

Тогда плохой ключ временно уходит из ротации и потом может вернуться.

---

### transparent retry

Пользователь не должен видеть:

> provider failed

Он должен видеть продолжающийся дебат.

Под капотом:

```text
timeout
→ rotate
→ replay context
→ continue
```

---

### context continuity

Самое критичное для дебатов.

При смене ключа новый запрос должен получить:

* весь текущий state
* историю ветки
* активную позицию агента

Иначе дебат “ломается характером”.

---

## 2. Потом — расширять пул ключей

Сейчас 19 — это уже хороший operational pool.

Если orchestration хороший, этого достаточно для:

* балансировки
* fallback
* provider rotation
* recovery

Добавление новых ключей сейчас даст меньше эффекта, чем улучшение failover.

---

Если смотреть стратегически, твой следующий качественный скачок —

не:

> “у меня 25–30 ключей”

а:

> “любой ключ может умереть, а дебат даже не заметит”

Вот это будет ощущаться как реально зрелая система.
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
Сильная стратегия. Четыре пункта — это фактически архитектура для production-grade runtime.

Коротко по каждому:

**Sticky session routing** — в `ProviderRouter` уже есть `sessionAffinity` параметры, но они не привязаны к дебат-сессии; при смене раунда может переключить. Нужен `sessionId → keyId` мэппинг с guard `key.alive === true`.

**Health decay** — сейчас `ProbeService` выдаёт только `ready/limited/broken`. Нужна шкала: `100% → 75% → 50% → 25% → 0%` с временем восстановления. `KeyStateStore` уже хранит проекцию, можно достроить.

**Transparent retry** — `chat-service.ts` уже имеет `resolveWithFallback`, но он возвращает ошибку пользователю. Нужен replay: перехватить ошибку, найти новый ключ, перепослать весь контекст.

**Context continuity** — самое трудное. Дебат хранит `session.rounds[]`, но при смене адаптера теряется system prompt. Надо сериализовать полный `DebateContext` и передавать в `sendMessage()`.

Это на неделю работы минимум. С чего хочешь начать?

--------------

Этот roadmap описывает 4 стадии. Вот как они выглядят сейчас с учётом уже сделанного:

Стадия 1. Sticky session routing — ~80% готово
Подзадача	Статус
SessionAffinityStore (bind/get/unbind/evict)	✅
ProviderRouter интеграция (sessionId param)	✅
DebateService binding после callLLM	✅
Projection-driven eviction с hysteresis	✅
Grace fallback routing (degraded/limited)	✅
Same-provider fallback (при отказе — сначала другой ключ того же провайдера, потом другой провайдер)	❌
Стадия 2. Health decay — 0%
Подзадача	Статус
KeyStateStore: status из enum → шкала 0–100	❌
ProbeResult: ready/limited/broken → числовой score	❌
Routing scoring: weighted by health score	❌
Recovery timer: degraded ключи возвращаются после N минут	❌
Стадия 3. Transparent retry — 0%
Подзадача	Статус
Перехват ошибки в executeArgumentRound	❌
Поиск нового ключа без потери round	❌
Replay context на новом ключе	❌
UI-propagated retry без остановки дебата	❌
Стадия 4. Context continuity — 0%
Подзадача	Статус
DebateContext сериализация	❌
System prompt preservation при смене адаптера	❌
Передача полного контекста в sendMessage	❌