# Roadmap — CHAT Module Evolution

> Multi-phase evolution plan for the Chat interface (ChatPanel + ChatService + ChatStore).
> Created 2026-06-01, based on current state of `src/components/ChatPanel/`, `src/stores/useChatStore.ts`, `src/kernel/services/chat-service.ts`.

---

## 📊 Current State (v4.6.0)

### Implemented ✅
- **ChatPanel** (60K lines) — primary chat interface with streaming, markdown rendering, multi-provider comparison, conversation management
- **ChatAdminPanel** — session list/search/delete, bulk export/import, message filtering
- **ChatService** — orchestrates LLM calls, model selection, 429 retry, race-execution, fallback
- **ChatBookmarksService + BookmarksPanel** — save/manage messages, Ctrl+Shift+B shortcut
- **ChatExportPanel + utils/chat-export.ts** — MD/JSON/HTML export
- **MessageIndexService + MessageSearchPanel** — full-text + regex search with filters (role/provider/model/session/date/tokens)
- **useChatStore** — Zustand store, session management, infinite scroll for session list
- **Mid-conversation model switching** (v4.2.3) — change provider/model mid-chat
- **Temperature + maxTokens controls** in input area
- **Race execution** — N providers respond in parallel, fastest wins
- **Streaming** with chunked response, markdown rendering with syntax highlighting
- **MarkdownRenderer** (13K lines) — code blocks, tables, lists, links
- **Memory recall** — relevant memories shown above responses
- **Per-session config** — currentProvider, currentModel, currentKeyId stored on session
- **Chat session persistence** via SQLite (`SqliteSessionStore`)

### Known Gaps ❌
- No message editing (C-10) — typo means rewrite from scratch
- No message threading/branches (C-08) — fork a conversation mid-thread
- No inline citations/footnotes (sources from RAG not displayed)
- No code execution in chat (C-12) — paste code, run, get result
- No file attachments (drop image, get vision response)
- No voice input/output (no STT/TTS)
- No chat-to-debate (C-30) — "discuss in debate" doesn't work
- No multi-AI response (C-26) — can't see GPT + Claude + Gemini side-by-side
- No persona/role switching (C-28) — chat is always default assistant
- No tone control (C-29) — formal/friendly/sarcastic not selectable
- No A/B comparison (C-27) — can't compare two responses side-by-side
- No message reactions/feedback (👍/👎 to train)
- No auto-summarization for long chats (>50 messages)
- No "rewind" — can't roll back to earlier point in conversation
- No "fork from here" — can't branch conversation
- Chat history not visualized as graph (just linear list)
- No chat session templates (start a chat with preset system prompt)
- No "continue from" — start new chat seeded with last N messages
- No collaborative sessions (multi-user, even self+other-tab)
- Memory injection not configurable (always injects top-K)
- No "thinking mode" indicator (user doesn't see when LLM is reasoning)

---

## 🎯 Phase 1: Editing & Navigation (P0 — 1-2 weeks)

### 1.1 Message Editing with History (C-10) ✅ DONE
**Why:** Typos, wrong wording, want to rephrase. Currently must scroll up, copy, paste, lose context. Editing is a fundamental chat UX expectation.

**Plan:**
- Add `edit(messageId, newText)` to ChatService
- Store edit history: `ChatEntry.edits: { text, timestamp }[]`
- On edit: re-trigger LLM call from that point, keep history
- UI: hover message → "Edit" icon (pencil)
- Edit modal: textarea with original + "Save and regenerate"
- Display: edited message shows "edited" badge
- Replay: clicking edited message shows edit history timeline

**Files:**
- `src/stores/useChatStore.ts` — `editEntry`, `edits` field
- `src/components/ChatPanel/ChatPanel.tsx` — edit button + modal
- `src/kernel/services/chat-service.ts` — regenerate from edit
- `src/kernel/contracts/storage/session-store.ts` — `edits` field on `ChatEntry`
- `src/i18n/translations/{en,ru}.ts` — keys

**Effort:** 3-4 days

### 1.2 Fork / Branch Conversations (C-08)
**Why:** User wants to explore "what if I'd asked differently?" without losing original thread. Branching is how Obsidian, ChatGPT canvas, and Claude projects work.

**Plan:**
- `ChatSession.forkedFrom?: { sessionId, messageId }`
- Add "Fork from here" button on hover
- On fork: copy session, truncate history at messageId, set as new active session
- Sidebar: show parent session link in forked sessions
- UI: visual indicator of fork point (downward arrow icon)

**Files:**
- `src/stores/useChatStore.ts` — `forkSession(parentId, atMessageId)`
- `src/components/ChatPanel/ChatPanel.tsx` — fork button
- `src/components/ChatAdminPanel/ChatAdminPanel.tsx` — show fork tree

**Effort:** 2-3 days

### 1.3 Rewind / Rollback
**Why:** User sent bad message, wants to undo. Currently must delete and continue. Rewind is faster.

**Plan:**
- Add "Rewind to here" button on user messages
- Confirmation: "This will delete all messages after this point"
- On rewind: truncate session history, LLM context
- Undo rewind: 5-second window to undo

**Files:**
- `src/stores/useChatStore.ts` — `rewindTo(messageId)`
- `src/components/ChatPanel/ChatPanel.tsx` — rewind button

**Effort:** 1-2 days

### 1.4 Inline Citations
**Why:** RAG memories and tool results are injected but not attributed. User doesn't know where the answer came from.

**Plan:**
- Track `citations: { source: string, score: number }[]` on each `ChatResponse`
- Display: superscript numbers `[1]` in response
- Sidebar/hover: shows citation source
- New `CitationPanel` tab in chat sidebar

**Files:**
- `src/types/chat.ts` — `citations` field
- `src/components/ChatPanel/ChatMessage.tsx` — citation rendering
- `src/components/ChatPanel/CitationPanel.tsx` — new

**Effort:** 2-3 days

### 1.5 Long-Message Auto-Collapse (C-14)
**Why:** Long messages (1000+ words) make chat scroll-heavy. Need progressive disclosure.

**Plan:**
- Messages >300 words: collapse to first 3 paragraphs
- "Show more" button at cutoff
- Animated expand/collapse
- User setting: collapse threshold (150/300/500/none)

**Files:**
- `src/components/ChatPanel/ChatMessage.tsx` — collapse logic
- `src/components/ChatPanel/SettingsMenu.tsx` — threshold config

**Effort:** 1-2 days

---

## 🚀 Phase 2: Multi-Modal & Multi-AI (P1 — 2-4 weeks)

### 2.1 Multi-AI Side-by-Side (C-26)
**Why:** Different AIs have different strengths. Currently only one response at a time. Side-by-side enables direct comparison.

**Plan:**
- New `MultiChatMode`: select 2-4 providers
- Each provider responds in parallel (use existing race executor)
- Display: vertical stack of responses, each with provider label
- "Use this response" button: picks the best one, others hidden
- Configurable: which providers, which models, in which order
- New `MultiChatModeToggle` in input area

**Files:**
- `src/components/ChatPanel/MultiChatView.tsx` — new
- `src/kernel/services/chat-service.ts` — multi-response mode
- `src/components/ChatPanel/ChatPanel.tsx` — mode toggle

**Effort:** 4-5 days

### 2.2 Inline Code Execution (C-12) ✅ DONE
**Why:** Chat about code = want to test it. Currently copy → run elsewhere. Inline execution = instant feedback.

**Plan:**
- Detect code blocks in user/assistant messages
- "Run" button on each block (▶️ icon)
- Sandbox execution via existing `sandbox.worker.ts` (already exists for tools)
- Display: result below code (stdout/stderr, charts, tables)
- Languages: JS, Python (via Pyodide), shell
- Safety: timeout 5s, memory cap, no network

**Files:**
- `src/components/ChatPanel/CodeBlock.tsx` — new (wraps MarkdownRenderer)
- `src/llm/sandbox/sandbox.worker.ts` — extend
- `src/services/sandbox/sandbox-service.ts` — already exists, integrate

**Effort:** 5-6 days

### 2.3 File Attachments + Vision
**Why:** Drop a screenshot, ask "what's wrong?" Currently must describe in text.

**Plan:**
- Drag-and-drop zone in input area
- Files: images (PNG, JPG, WEBP), PDFs, text files
- Encode as data URL, send to vision-capable model
- Display: thumbnail + click to expand
- Vision models: GPT-4o, Claude 3.5, Gemini 1.5 Pro, Llama 3.2 Vision
- For PDFs: extract text + first page as image
- Storage: attachments on `ChatEntry` (cap 10MB per message)

**Files:**
- `src/components/ChatPanel/AttachmentDropZone.tsx` — new
- `src/types/chat.ts` — `attachments: Attachment[]`
- `src/kernel/services/chat-service.ts` — multimodal dispatch
- `src/llm/openai-compatible/openai-compatible-adapter.ts` — vision support

**Effort:** 4-5 days

### 2.4 Voice Input (STT)
**Why:** Hands-free, faster than typing for long thoughts. Hobby user with Windows PC + mic.

**Plan:**
- "Hold to talk" button in input area (or keyboard shortcut Space)
- Use browser-native `SpeechRecognition` API (free, no API key)
- Fallback: OpenAI Whisper for better accuracy
- Visual: pulsing red dot while recording
- Transcript: appears in input box, user can edit before send
- Settings: language, auto-punctuation

**Files:**
- `src/components/ChatPanel/VoiceButton.tsx` — new
- `src/llm/audio/browser-stt.ts` — new
- `src/llm/audio/openai-stt.ts` — new (already in providers roadmap)

**Effort:** 2-3 days

### 2.5 Chat Personas / Custom System Prompts (C-28)
**Why:** Different tasks need different tones. "Code reviewer" vs "creative writer" vs "data analyst" — same chat, different system prompt.

**Plan:**
- Persona library: built-in (Teacher, Code Reviewer, Creative Writer, Data Analyst, Therapist)
- Custom personas: user-defined name + system prompt
- Persona selector in input area: dropdown of recent + favorites
- Per-session persona: stored on `ChatSession.systemPrompt`
- Quick switch: changes system prompt, keeps message history
- New `PersonaPanel` for full editor

**Files:**
- `src/kernel/services/persona-service.ts` — new
- `src/components/ChatPanel/PersonaSelector.tsx` — new
- `src/components/PersonaPanel/PersonaPanel.tsx` — new
- `src/stores/useChatStore.ts` — `systemPrompt` field

**Effort:** 3-4 days

### 2.6 Tone Control (C-29)
**Why:** Same question, different contexts need different formality. Quick control = manual override.

**Plan:**
- Tone presets: Formal, Friendly, Sarcastic, Concise, Verbose
- Maps to system prompt prefix and temperature adjustment
- Per-message override: dropdown in input area
- Per-session default: stored on session

**Files:**
- `src/components/ChatPanel/ToneSelector.tsx` — new
- `src/i18n/translations/{en,ru}.ts` — keys

**Effort:** 1-2 days

---

## 🌟 Phase 3: Intelligence & Memory (P2 — 4-8 weeks)

### 3.1 Long-Chat Auto-Summarization
**Why:** 100+ message chats exceed context. Need rolling summary to maintain coherence.

**Plan:**
- Threshold: every 30 messages, generate summary of previous 30
- Summary: 1-2 paragraphs, key facts, decisions made
- Inject summary at start of new messages
- UI: collapsible "Conversation summary" panel at top
- Toggle: user can disable auto-summary

**Files:**
- `src/kernel/services/chat-summarizer-service.ts` — new
- `src/stores/useChatStore.ts` — summary field, auto-trigger
- `src/components/ChatPanel/SummaryPanel.tsx` — new

**Effort:** 3-4 days

### 3.2 RAG Memory Integration (Real) ✅ DONE
**Why:** Currently memory recall shows "relevant memories" but doesn't deeply integrate. User wants semantic search across all past chats.

**Plan:**
- Vector embeddings for all chat messages (using new embeddings adapter from Providers roadmap)
- `MemoryService.search(query, k=10)` returns top-K semantic matches
- Display: "From your past conversations" with quotes
- New `MemoryContextPanel` shows what's being injected
- Config: max K, recency filter, score threshold

**Files:**
- `src/kernel/services/memory-service.ts` — vector search
- `src/llm/embeddings/*` — embedding adapters (from Providers roadmap)
- `src/components/ChatPanel/MemoryContextPanel.tsx` — new
- `src/components/SettingsPanel/SettingsPanel.tsx` — config UI

**Effort:** 5-6 days (depends on embeddings adapters)

### 3.3 Chat → Debate Conversion (C-30)
**Why:** Chat hits an interesting disagreement. User wants to formalize as debate. Should be one click.

**Plan:**
- "Start debate" button on user/assistant message
- Modal: select participants (default: 3 agents from last-used), topic from message
- New `DebateSession` with topic = message text, opening statement = message
- Pre-seed agents' system prompts with chat context
- Result: continue chat in debate mode, then come back

**Files:**
- `src/components/ChatPanel/StartDebateButton.tsx` — new
- `src/kernel/services/auto-debate-service.ts` — extend with chat context
- `src/components/DebatePanel/DebatePanel.tsx` — pre-fill from chat

**Effort:** 2-3 days

### 3.4 Chat Session Templates
**Why:** Common tasks = common starting points. "Code review", "Brainstorm", "Meeting notes" — preset templates save time.

**Plan:**
- Template library: pre-built (Code Review, Brainstorm, Translate, Summarize, Q&A Research)
- Template = { name, icon, systemPrompt, defaultModel, suggestedProviders }
- Apply template: creates new session with system prompt already set
- Custom templates: user-defined, saved to localStorage
- New `TemplatesPanel` for full editor

**Files:**
- `src/kernel/services/chat-template-service.ts` — new
- `src/components/ChatPanel/TemplateSelector.tsx` — new
- `src/components/ChatTemplatePanel/ChatTemplatePanel.tsx` — new

**Effort:** 2-3 days

### 3.5 A/B Response Comparison (C-27)
**Why:** Two providers, two answers — which is better? Currently must manually copy-paste. Side-by-side viewer needed.

**Plan:**
- "Compare responses" mode in chat input
- Send same prompt to 2 selected providers
- Display: two columns, sync scroll
- Voting: 👍 on preferred, persisted per-prompt-pair
- Leaderboard: provider wins tracked in `DecisionLog`
- New `CompareView` in ChatPanel

**Files:**
- `src/components/ChatPanel/CompareView.tsx` — new
- `src/kernel/services/chat-compare-service.ts` — new
- `src/stores/useChatStore.ts` — comparison storage

**Effort:** 3-4 days

### 3.6 Message Feedback (Like/Dislike)
**Why:** Collect training data. User signals "good answer" / "bad answer" — feeds into provider scoring.

**Plan:**
- 👍 / 👎 buttons on each assistant message
- On click: emit event, store in `DecisionLog.feedback`
- Aggregated: provider quality score from feedback
- Optional: edit + resubmit ("thumbs down" → opens edit box)
- Settings: enable/disable feedback collection

**Files:**
- `src/components/ChatPanel/ChatMessage.tsx` — feedback buttons
- `src/stores/useChatStore.ts` — feedback field
- `src/types/chat.ts` — `feedback?: 'up' | 'down'`
- `src/kernel/services/quality-judge.ts` — integrate (from Providers roadmap)

**Effort:** 2 days

---

## 🔬 Phase 4: Collaborative & Advanced (P3 — 2-3 months)

### 4.1 Multi-User Collaborative Sessions
**Why:** Even solo user benefits from cross-device sync. Open chat on desktop, continue on phone.

**Plan:**
- `BroadcastChannel('chat-session')` for same-browser sync
- Optional: WebRTC for cross-device (no server needed)
- Conflict resolution: last-write-wins for new messages
- Visual indicator: "Active on 2 devices"
- Optional: invite link for shared sessions (read-only or full)

**Files:**
- `src/kernel/services/chat-sync-service.ts` — new
- `src/stores/useChatStore.ts` — sync integration
- `src/components/ChatPanel/SessionSyncIndicator.tsx` — new

**Effort:** 1-2 weeks

### 4.2 Chat as Knowledge Graph
**Why:** Linear chat is hard to navigate. Graph view reveals relationships between messages, topics, decisions.

**Plan:**
- Render session as graph: messages = nodes, references = edges
- Topic clusters colored by similarity (embeddings)
- Decision points highlighted
- Click node → jump to that message in linear view
- New `ChatGraphView` panel

**Files:**
- `src/components/ChatGraphView/ChatGraphView.tsx` — new
- `src/llm/embeddings/*` — for similarity clustering

**Effort:** 2-3 weeks

### 4.3 Live Cursor / Typing Indicators
**Why:** When collaborative, show "other user is typing..." (like Google Docs).

**Plan:**
- Track cursor position per user
- Show colored cursor labels in textarea
- "Typing..." indicator on input box
- "X is on message #5" footer

**Files:**
- `src/components/ChatPanel/CollaborativeCursor.tsx` — new
- `src/kernel/services/chat-sync-service.ts` — extend

**Effort:** 1 week

### 4.4 Voice Output (TTS)
**Why:** Read responses aloud for accessibility, multitasking.

**Plan:**
- Auto-play button per assistant message
- Uses TTS adapters from Providers roadmap (browser-native free default)
- Voice selection: dropdown of available voices
- Speed control: 0.5x-2x

**Files:**
- `src/components/ChatPanel/SpeakButton.tsx` — new
- `src/llm/audio/browser-tts.ts` — integrate (from Providers roadmap)

**Effort:** 2-3 days

### 4.5 Chat as Audio/Video Call
**Why:** Full voice/video interface to LLM. OpenAI Voice Mode, Google Gemini Live.

**Plan:**
- WebRTC connection to voice model (when supported)
- Real-time audio streaming, low latency
- Mute/unmute, push-to-talk
- Display: visualizer + transcript simultaneously

**Files:**
- `src/components/ChatPanel/VoiceMode.tsx` — new
- `src/llm/audio/realtime-adapter.ts` — new
- (depends on provider real-time API availability)

**Effort:** 3-4 weeks (research)

### 4.6 Onboarding Tutor
**Why:** First-time users don't know what's possible. Interactive tour teaches the features.

**Plan:**
- First-run wizard: 5-step tour (chat, settings, providers, debate, memory)
- Interactive: each step has "Try it" button that does the thing
- "Tip of the day" daily card in dashboard
- Skip option, replay from Settings
- New `OnboardingWizard` component

**Files:**
- `src/components/Onboarding/OnboardingWizard.tsx` — new
- `src/components/Onboarding/StepTour.tsx` — new
- `src/kernel/services/onboarding-service.ts` — new

**Effort:** 1-2 weeks

---

## 📊 Summary: Effort & Priority Matrix

| Phase | Items | Total Effort | When |
|-------|-------|--------------|------|
| **Phase 1: Editing & Nav** | Edit, Fork, Rewind, Citations, Collapse | ~10-15 days | Week 1-2 |
| **Phase 2: Multi-modal** | Multi-AI, Code exec, Files, Voice STT, Personas, Tone | ~20 days | Week 3-6 |
| **Phase 3: Intelligence** | Auto-summary, RAG memory, Chat-to-debate, Templates, A/B, Feedback | ~17-22 days | Week 7-12 |
| **Phase 4: Advanced** | Collab sync, Graph view, Live cursor, TTS, Voice mode, Onboarding | ~6-9 weeks | Month 4+ |

**Total to complete all phases: ~3 months full-time**

## 🎯 Recommended First Sprint (this week)

If you only do one thing this week, do **Message Editing (1.1)**. It's:
- The most-requested feature (every chat app has it)
- Low complexity (UI + storage, no new architecture)
- Foundation for branching (1.2) and rollback (1.3)
- Unlocks feedback workflows (3.6)

Editing is a multiplier — once users can edit, they experiment more, which means more value from the chat system overall.

---

*Document version: 1.0 — 2026-06-01*
*Next review: after Phase 1 completion*
