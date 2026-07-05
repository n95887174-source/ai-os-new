> **STATUS:** 🟢 Implemented 2026-06 — все ключевые концепты реализованы: Memory Extractor, Embedding Pipeline, RAG Retriever, Memory Graph.
> **Источник:** Дизайн-нотация, предшествовавшая реализации. Сохранена как архив.

Это уже уровень, где твоя система превращается из “набора дебатов” в **единый интеллект с памятью по всем сессиям**.

Разберём правильно, без магии.

---

# 1. Что ты хочешь на самом деле

Ты хочешь 2 вещи:

## 1) Memory (как ChatGPT)

- система “помнит” прошлые дебаты
- может использовать их в новых

## 2) Search / RAG по дебатам

- искать аргументы, решения, паттерны
- доставать релевантные куски из истории

---

# 2. Ключевая ошибка, которую нельзя допустить

❌ “искать по JSON дебатов напрямую”

❌ “делать full-text search по timeline”

Это быстро сломается.

---

# 3. Правильная архитектура: 3 слоя памяти

## 1) Raw Memory (истина)

```text id="m1"
DebateRoom + Timeline + Snapshot
```

- всё как есть
- неизменяемое
- источник истины

---

## 2) Indexed Memory (поиск)

```text id="m2"
MemoryIndex {
  embedding
  chunk
  metadata
}
```

- разбитые куски дебатов
- аргументы агентов
- решения
- споры

---

## 3) Semantic Memory (RAG слой)

```text id="m3"
Vector DB + Retriever
```

- отвечает на запросы
- возвращает релевантные дебаты

---

# 4. Что именно индексировать (очень важно)

Не весь дебат.

Иначе будет мусор.

Индексируешь:

## A) Аргументы

- claim
- counterclaim
- reasoning

---

## B) Решения

- final consensus
- verdict

---

## C) Конфликты

- disagreement points
- contradictions

---

## D) Инсайты

- “math check failed”
- “critic was wrong”
- “security risk found”

---

# 5. Как выглядит pipeline

## При завершении дебата:

```text id="p1"
DebateRoom.completed
   ↓
Timeline → chunker
   ↓
extract semantic units
   ↓
embed
   ↓
store in vector DB
```

---

# 6. Chunking (самая важная часть)

Не режь по строкам.

Режь по смыслу:

```text id="c1"
Chunk = {
  agent,
  type: argument | rebuttal | decision,
  content,
  context,
  score,
  debateId
}
```

---

# 7. RAG запрос (как это работает)

Когда ты делаешь новый дебат:

```text id="q1"
User: "дебат про архитектуру системы"
```

Система делает:

## 1. Query embedding

## 2. Search across all debates

## 3. Returns:

- похожие архитектурные дебаты
- прошлые ошибки
- сильные аргументы

---

# 8. Memory injection (очень мощная часть)

Перед стартом дебата:

```text id="i1"
System prompt += retrieved memory
```

Но важно:

👉 не весь memory
👉 только top-k релевантных chunks

---

# 9. Memory types (как у ChatGPT)

Тебе нужно 3 типа памяти:

## 1) Episodic Memory

- конкретные дебаты

## 2) Semantic Memory

- обобщённые знания из дебатов

## 3) Procedural Memory

- “как система решает задачи”
- паттерны дебатов

---

# 10. Архитектура целиком

```text id="a1"
DebateRoom → Timeline → Snapshot
                    ↓
             Memory Extractor
                    ↓
           Embedding Pipeline
                    ↓
              Vector Store
                    ↓
         RAG Retriever Layer
                    ↓
         New Debate Context
```

---

# 11. Что ты получаешь в итоге

После этого система сможет:

## 1. “помнить прошлые дебаты”

## 2. находить похожие аргументы

## 3. не повторять старые ошибки

## 4. улучшать качество дебатов со временем

## 5. строить “эволюцию знаний”

---

# 12. Самая сильная идея (уровень выше RAG)

Ты можешь потом добавить:

## Debate Memory Graph

- узлы = идеи
- связи = “опроверг”, “улучшил”, “зависит от”

Это уже не RAG.

Это:

> **knowledge evolution system**

---

# 13. Минимальный backlog (что добавить тебе сейчас)

---

## 🔴 P0 — Memory Foundation

- MemoryExtractor (from Timeline)
- Chunk schema
- Embedding pipeline
- Vector store (per debate + global)

---

## 🟠 P1 — RAG Layer

- retrieveRelevantDebates(query)
- injectMemoryIntoDebate()
- similarity scoring

---

## 🟡 P2 — Memory UI

- “Related debates” panel
- “Why system suggested this”
- search across debates

---

# Итог

Ты сейчас переходишь от:

> “multi-agent system”

к

> “self-improving reasoning system with memory”

---

Если хочешь дальше, следующий шаг самый интересный:

**как сделать чтобы система сама улучшала своих агентов на основе прошлых дебатов (auto-agent evolution)**
