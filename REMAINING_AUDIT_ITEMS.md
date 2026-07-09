# Remaining Unfixed Audit Items

> Generated 2026-07-08 10:15
> Source: Catalog sections from audit report, cross-referenced with STATUS_HML.md
>
> | Priority  | Catalog Total | Fixed   | Remaining |
> | --------- | ------------- | ------- | --------- |
> | Medium    | 195           | 153     | 42        |
> | Low       | 77            | 58      | 19        |
> | **Total** | **272**       | **211** | **61**    |

---

## Remaining Medium (42)

| #   | Audit | ID       | Description                                                                                         |
| --- | ----- | -------- | --------------------------------------------------------------------------------------------------- |
| 15  | `1b`  | `M-9`    | virtual-key-service.ts stores realKeyId mappings as plaintext in IndexedDB                          |
| 54  | `2a`  | `M-9`    | AgentsPanelContainer status contract drift; ignores AgentService.getLifecycleState()                |
| 55  | `2b`  | `A4`     | storeBatch() still deletes from Dexie when in-memory cache exceeds 1000 [Critical — already flagge… |
| 58  | `2b`  | `B6`     | MemoryOrchestrator.recall() doesn't deduplicate across stores                                       |
| 59  | `2b`  | `B7`     | Importance scale mismatch: stores default to 5, engine uses 0–1                                     |
| 61  | `2b`  | `D3`     | persist() swallows errors; caller sees success                                                      |
| 76  | `2b`  | `N3`     | init() skips 4 cognitive events; record() doesn't                                                   |
| 77  | `2b`  | `N4`     | getSince(sequence) only sees current events, not evicted ones                                       |
| 78  | `2b`  | `P3`     | KnowledgePanel.handleSaveEdit() triggers updateMemory() which breaks the ID invariant (see A1) […   |
| 79  | `2b`  | `P4`     | KnowledgePanel density is computed on the filtered graph; type counts on unfiltered                 |
| 80  | `2b`  | `P6`     | BookmarksPanel calls getAllTags()/count() on every render; CHAT_REWOUND deletes from cache o…       |
| 81  | `2b`  | `P7`     | ChatBookmarksService.addBookmark writes cache before storage; no dedup on sessionId+messageId       |
| 110 | `2e`  | `P0`     | Fix routing correctness bugs (C9, C10, C11)                                                         |
| 111 | `2e`  | `P0`     | Fix budget cost accounting (C13, C14)                                                               |
| 112 | `2e`  | `P1`     | Remove or label mock services (C1-C8)                                                               |
| 113 | `2e`  | `P1`     | Fix session leak (C15) and reconnection clobber (C16)                                               |
| 114 | `2e`  | `P2`     | Fix decorator error types (H5, H6, H7)                                                              |
| 115 | `2e`  | `P2`     | Fix cost-optimization dead code (C12, H10, H12)                                                     |
| 116 | `2e`  | `P3`     | Improve observability (H2, H4, M5)                                                                  |
| 137 | `3b`  | `M17`    | service.getAgentStats(e.agentId) called per-entry per-render — N+1 performance                      |
| 168 | `3e`  | `A-M-4`  | GroupsPanel error toasts are <div onClick> — not keyboard-dismissible                               |
| 171 | `3e`  | `A-M-7`  | Debate live state changes not announced to screen readers                                           |
| 172 | `3e`  | `A-M-8`  | 123 of 315 aria-labels are hardcoded English — bypass i18n                                          |
| 173 | `3e`  | `D-M-1`  | lucide-react: ^1.14.0 — likely wrong version (current stable is 0.x)                                |
| 174 | `3e`  | `D-M-2`  | typescript: ~6.0.2 — TS 6 is beta/RC, ecosystem support limited                                     |
| 175 | `3e`  | `D-M-3`  | react: ^19.2.5 + react-dom: ^19.2.5 — very new, ecosystem edge cases                                |
| 176 | `3e`  | `D-M-4`  | vite: ^8.0.10 + @vitejs/plugin-react: ^6.0.1 — bleeding-edge build tooling                          |
| 177 | `3e`  | `D-M-5`  | @huggingface/transformers: ^4.2.0 — 1-3MB, verify lazy-loading                                      |
| 178 | `3e`  | `D-M-6`  | @monaco-editor/react: ^4.7.0 — loaded from CDN, runtime external dependency                         |
| 179 | `3e`  | `D-M-7`  | @xyflow/react: ^12.10.2 + recharts: ^2.15.0 + framer-motion: ^12.38.0 — large viz libs              |
| 180 | `3e`  | `D-M-8`  | ws: ^8.21.0 in browser app dependencies — Node.js lib in browser bundle risk                        |
| 182 | `3e`  | `L-M-6`  | CostManagerDecorator.cumulativeCost is dead state — never read                                      |
| 184 | `3e`  | `L-M-8`  | RateLimitDecorator.forceLimited() is no-op after next request — per-provider buckets re-init at ma… |
| 185 | `3e`  | `L-M-9`  | RateLimitDecorator.checkRate() consumes global token even when provider consume fails               |
| 187 | `3e`  | `R-M-11` | BudgetService.checkThresholds alert lost if useNotificationStore not initialized                    |
| 188 | `3e`  | `R-M-12` | keyStateStore.loadPersisted failure > empty state, no recovery                                      |
| 189 | `3e`  | `R-M-6`  | RetryDecorator only retries if it's in the decorator chain — direct adapter use has no retry        |
| 190 | `3e`  | `R-M-7`  | CacheDecorator.#evictionTimer setInterval leaks if destroy() not called                             |
| 191 | `3e`  | `R-M-8`  | CacheDecorator.#inFlight Map entries leak on hung inner calls                                       |
| 192 | `3e`  | `R-M-9`  | No circuit breaker on gemini-model-validator — refresh failure never recovers                       |
| 193 | `3e`  | `S-M-7`  | keyStateStore.seedFromKeys wipes history for temporarily-removed keys                               |
| 194 | `3e`  | `S-M-8`  | useKeyStore.alerts updated by 4 events but resolveAlert only updates Zustand — drift after resol…   |

---

## Remaining Low (19)

| #   | Audit | ID       | Description                                                                                         |
| --- | ----- | -------- | --------------------------------------------------------------------------------------------------- |
| 4   | `1b`  | `L-4`    | notification-webhook-service.ts Slack/Discord/Telegram payloads include full event data (potential… |
| 5   | `1b`  | `L-5`    | index.html CSP meta tag duplicates nginx.conf CSP (drift risk)                                      |
| 25  | `2b`  | `A7`     | recall() returns MemoryEntry & {score} but is typed MemoryEntry[]                                   |
| 26  | `2b`  | `A8`     | clear() doesn't reset semanticReady                                                                 |
| 28  | `2b`  | `J3`     | No persistence                                                                                      |
| 31  | `2b`  | `P5`     | MemoryPalacePanel shows hardcoded 7 rooms with 0 entries if orchestrator fails to load              |
| 48  | `3b`  | `L10`    | KeyboardShortcutsModal labels are hardcoded English                                                 |
| 49  | `3b`  | `L11`    | SettingsPanel and DashboardPanel are 29KB and 88KB respectively; spot-checked imports only          |
| 57  | `3b`  | `L9`     | Entirely hardcoded English; no useTranslation                                                       |
| 66  | `3c`  | `L9`     | sync-server.mjs WebSocket origin check happens AFTER token check                                    |
| 69  | `3e`  | `A-L-10` | <html lang="en"> is hardcoded — never updated when user switches language                           |
| 70  | `3e`  | `A-L-9`  | ChatInputArea send/stop buttons have aria-hidden icon but no aria-label on button                   |
| 71  | `3e`  | `D-L-10` | dompurify: ^3.2.4 — verify CVE-2024-47875 patched                                                   |
| 72  | `3e`  | `D-L-11` | @google/generative-ai: ^0.24.1 — deprecated, renamed to @google/genai                               |
| 73  | `3e`  | `D-L-12` | eslint: ^10.2.1 + typescript-eslint: ^8.58.2 — version mismatch risk                                |
| 74  | `3e`  | `D-L-9`  | 25 duplicate package versions in lockfile — bundle bloat                                            |
| 75  | `3e`  | `L-L-10` | CostManagerDecorator.getPricing() falls back to $0.002/$0.008 per 1K for unknown models — 10-100x … |
| 76  | `3e`  | `R-L-13` | RateLimitDecorator.cleanupProviders evicts FIFO — may evict active providers                        |
| 77  | `3e`  | `S-L-10` | keyStateStore.persist() fire-and-forget — failed writes silently lost                               |
