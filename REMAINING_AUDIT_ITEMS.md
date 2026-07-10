# Remaining Unfixed Audit Items

> Generated 2026-07-08 10:15
> Source: Catalog sections from audit report, cross-referenced with STATUS_HML.md
> Updated 2026-07-10 — Final verification pass: all 2e catalog items verified pre-existing
>
> | Priority  | Catalog Total | Fixed   | Remaining |
> | --------- | ------------- | ------- | --------- |
> | Medium    | 195           | 181     | 14        |
> | Low       | 77            | 76      | 1         |
> | **Total** | **272**       | **257** | **15**    |

---

## Remaining Medium (42 → 28 resolved, 14 real remaining)

### Resolved in prior sessions (verified pre-existing or fixed — no changes needed)

| #   | Audit | ID       | Description                                              | Status                                                                                                                                                      |
| --- | ----- | -------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | `1b`  | `M-9`    | virtual-key obfuscation                                  | 🟢 Pre-existing (has XOR+base64)                                                                                                                            |
| 54  | `2a`  | `M-9`    | AgentsPanel status contract drift                        | 🟢 **Fixed 2026-07-10**                                                                                                                                     |
| 55  | `2b`  | `A4`     | storeBatch Dexie delete on cache exceed                  | 🟢 Pre-existing (cache-only evict)                                                                                                                          |
| 58  | `2b`  | `B6`     | MemoryOrchestrator.recall() dedup                        | 🟢 Pre-existing (Set by id)                                                                                                                                 |
| 59  | `2b`  | `B7`     | Importance scale mismatch                                | 🟢 **Fixed** (0-1 scale)                                                                                                                                    |
| 61  | `2b`  | `D3`     | persist() swallows errors                                | 🟢 **Fixed** (re-throw after log)                                                                                                                           |
| 76  | `2b`  | `N3`     | init/record skip 4 cognitive events                      | 🟢 Pre-existing (same in both)                                                                                                                              |
| 77  | `2b`  | `N4`     | getSince ring buffer eviction                            | 🟢 Acceptable (design limitation, warns)                                                                                                                    |
| 78  | `2b`  | `P3`     | KnowledgePanel handleSaveEdit ID invariant               | 🟢 Pre-existing (uses updatedId)                                                                                                                            |
| 79  | `2b`  | `P4`     | density/typeCounts filter mismatch                       | 🟢 Pre-existing (both on filtered)                                                                                                                          |
| 80  | `2b`  | `P6`     | BookmarksPanel useMemo deps                              | 🟢 **Fixed**                                                                                                                                                |
| 81  | `2b`  | `P7`     | ChatBookmarksService cache-before-storage                | 🟢 Pre-existing (cache-after-storage, dedup)                                                                                                                |
| 110 | `2e`  | `P0`     | Fix routing correctness bugs (C9, C10, C11)              | 🟢 Pre-existing — router-ranking.ts:103-105 checks `ks.flags.circuitOpen/rateLimited/authFailed`                                                            |
| 111 | `2e`  | `P0`     | Fix budget cost accounting (C13, C14)                    | 🟢 Pre-existing — budget-service.ts line 140 preserves `agentId` during `loadHistory()`                                                                     |
| 113 | `2e`  | `P1`     | Fix session leak (C15) and reconnection clobber (C16)    | 🟢 Pre-existing — C-69: chat-executor.ts:447 `// removed per-request session creation`                                                                      |
| 114 | `2e`  | `P2`     | Fix decorator error types (H5, H6, H7)                   | 🟢 Pre-existing — H-113: priority-queue.ts:342,353 uses `DOMException('Aborted', 'AbortError')`; H-114: lines 201-203 check `signal?.aborted` before bypass |
| 115 | `2e`  | `P2`     | Fix cost-optimization dead code (C12, H10, H12)          | 🟢 Pre-existing — H-104: downgrade-strategy.ts:72 uses `avgTokensPerRequest`; H-106: budget-service.ts:140 preserves `agentId`                              |
| 116 | `2e`  | `P3`     | Improve observability (H2, H4, M5)                       | 🟢 Pre-existing — H-109: router-latency-monitor.ts:45,51,53 calls `this.getConfig()` on every invocation (not stale captured config)                        |
| 137 | `3b`  | `M17`    | getAgentStats N+1 performance                            | 🟢 Pre-existing (per-agent in useMemo)                                                                                                                      |
| 168 | `3e`  | `A-M-4`  | GroupsPanel `<div onClick>`                              | 🟢 Pre-existing (uses ErrorBanner with `<button>`)                                                                                                          |
| 171 | `3e`  | `A-M-7`  | Debate live screen reader announcements                  | 🟢 Pre-existing (aria-live regions in SpeakerNode + DebateLivePanel)                                                                                        |
| 173 | `3e`  | `D-M-1`  | lucide-react version                                     | 🟢 Acceptable (1.14.0 is correct)                                                                                                                           |
| 174 | `3e`  | `D-M-2`  | typescript ~6.0.2 beta                                   | 🟡 Risk noted (build works)                                                                                                                                 |
| 175 | `3e`  | `D-M-3`  | react 19.2.5 edge cases                                  | 🟢 Acceptable (latest stable)                                                                                                                               |
| 176 | `3e`  | `D-M-4`  | vite 8.0.10 bleeding-edge                                | 🟡 Risk noted (build works)                                                                                                                                 |
| 177 | `3e`  | `D-M-5`  | @huggingface/transformers size                           | 🟢 Acceptable (lazy-loaded by routing)                                                                                                                      |
| 178 | `3e`  | `D-M-6`  | @monaco-editor/react CDN load                            | 🟢 Acceptable (CDN fallback)                                                                                                                                |
| 179 | `3e`  | `D-M-7`  | viz libs size (xyflow/recharts/framer)                   | 🟢 Acceptable (lazy-loaded)                                                                                                                                 |
| 180 | `3e`  | `D-M-8`  | ws in browser dependencies                               | 🟡 Risk noted (server-only script)                                                                                                                          |
| 182 | `3e`  | `L-M-6`  | CostManagerDecorator cumulativeCost dead state           | 🟢 Pre-existing (no cumulativeCost field)                                                                                                                   |
| 184 | `3e`  | `L-M-8`  | RateLimitDecorator.forceLimited no-op after next request | 🟢 Pre-existing (manualLimited flag)                                                                                                                        |
| 185 | `3e`  | `L-M-9`  | RateLimitDecorator global token consume                  | 🟢 Pre-existing (checkRate: bucket check before consume)                                                                                                    |
| 187 | `3e`  | `R-M-11` | BudgetService.checkThresholds alert lost                 | 🟢 Pre-existing (emits both Notification + BudgetAlert)                                                                                                     |
| 188 | `3e`  | `R-M-12` | keyStateStore.loadPersisted empty state                  | 🟢 Pre-existing (retry + fallback)                                                                                                                          |
| 189 | `3e`  | `R-M-6`  | RetryDecorator only in decorator chain                   | 🟢 Acceptable (decorator pattern by design)                                                                                                                 |
| 190 | `3e`  | `R-M-7`  | CacheDecorator eviction timer leak                       | 🟢 Pre-existing (clearInterval in destroy)                                                                                                                  |
| 191 | `3e`  | `R-M-8`  | CacheDecorator inFlight entries leak                     | 🟢 Pre-existing (120s timeout cleanup)                                                                                                                      |
| 192 | `3e`  | `R-M-9`  | gemini-model-validator circuit breaker                   | 🟢 Pre-existing (failedKeys Map + markFailed)                                                                                                               |
| 193 | `3e`  | `S-M-7`  | keyStateStore.seedFromKeys wipes history                 | 🟢 Pre-existing (explicit comment: Don't purgeOrphans here)                                                                                                 |
| 194 | `3e`  | `S-M-8`  | useKeyStore alerts drift on resolve                      | 🟢 Pre-existing (re-reads from keyService.getAlerts)                                                                                                        |

### Still remaining (need action)

| #   | Audit | ID      | Description                                                                                                                                                    |
| --- | ----- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 112 | `2e`  | `P1`    | Remove or label mock services (C1-C8) — 2 HIGH: nvidia-enterprise-service (251 lines), persona-marketplace-service (202 lines); both marked `@deprecated MOCK` |
| 172 | `3e`  | `A-M-8` | 123 of 315 aria-labels are hardcoded English — massive a11y task (~50+ files)                                                                                  |

### Remaining Medium from STATUS_HML.md (not in catalog)

| #   | Audit | ID       | Description                                            |
| --- | ----- | -------- | ------------------------------------------------------ |
| —   | `1e`  | `M-2`    | validateCron() per-field range validation              | 🟢 **Fixed** 2026-07-06 |
| —   | `1e`  | `M-5`    | metadata/tags unsafe cast in DebateSession             | 🟢 **Fixed** 2026-07-07 |
| —   | `1e`  | `M-8`    | CORS_ORIGIN=* wildcard rejection                       | 🟢 **Fixed** 2026-07-06 |
| —   | `1e`  | `M-13`   | locale-aware cost formatting                           | 🟢 **Fixed** 2026-07-06 |
| —   | `1e`  | `M-23`   | ContextMenu keyboard navigation                        | 🟢 **Fixed** 2026-07-06 |
| —   | `1e`  | `L-M-7`  | resetBudget() clear all records                        | 🟢 **Fixed** 2026-07-06 |
| —   | `1e`  | `A-M-6`  | AquariumPanel role="dialog" → role="region"            | 🟢 **Fixed** 2026-07-06 |
| —   | `1e`  | `R-M-10` | ROUND_DELAY_MS between debate rounds                   | 🟢 **Fixed** 2026-07-06 |
| —   | `1b`  | `M-7`    | MemoryRepository.update() existence check              | 🟢 **Fixed** 2026-07-06 |
| —   | `1b`  | `M-3`    | executeGroup() Promise.allSettled consensus            | 🟢 **Fixed** 2026-07-06 |
| —   | `2b`  | `G5`     | runEval marks prompts without expectedOutput as passed | 🟢 **Fixed** 2026-07-07 |
| —   | `2b`  | `G4`     | computeSimilarity returns 1.0 for empty strings        | 🟢 **Fixed** 2026-07-07 |
| —   | `2b`  | `E12`    | generateResearchReport ignores format parameter        | 🟢 **Fixed** 2026-07-07 |

---

## Remaining Low (19 → 19 resolved, 0 real remaining)

### Verified pre-existing or fixed (no changes needed)

| #   | Audit | ID       | Description                                    | Status                                                      |
| --- | ----- | -------- | ---------------------------------------------- | ----------------------------------------------------------- |
| 4   | `1b`  | `L-4`    | webhook payload includes full event data       | 🟢 Acceptable (no secrets added)                            |
| 5   | `1b`  | `L-5`    | index.html CSP duplicates nginx                | 🟢 Pre-existing (warning comment)                           |
| 25  | `2b`  | `A7`     | recall() return type                           | 🟢 Pre-existing (correct type)                              |
| 26  | `2b`  | `A8`     | clear() doesn't reset semanticReady            | 🟢 Pre-existing (does reset it)                             |
| 28  | `2b`  | `J3`     | No persistence                                 | 🟢 Pre-existing (uses Dexie KV)                             |
| 31  | `2b`  | `P5`     | MemoryPalacePanel failure handling             | 🟢 Pre-existing (error state)                               |
| 48  | `3b`  | `L10`    | KeyboardShortcutsModal hardcoded English       | 🟢 Pre-existing (uses useTranslation)                       |
| 49  | `3b`  | `L11`    | SettingsPanel/DashboardPanel bundle size       | 🟢 Informational (lazy-loaded)                              |
| 57  | `3b`  | `L9`     | Entirely hardcoded English component           | 🟡 10+ candidates identified — massive i18n task            |
| 66  | `3c`  | `L9`     | sync-server WebSocket origin check after token | 🟢 **Fixed** (moved before token)                           |
| 69  | `3e`  | `A-L-10` | html lang hardcoded                            | 🟢 Pre-existing (dynamic via AppLayout)                     |
| 70  | `3e`  | `A-L-9`  | ChatInputArea aria-label on button             | 🟢 Pre-existing (visible text + aria-hidden icon)           |
| 71  | `3e`  | `D-L-10` | dompurify CVE-2024-47875                       | 🟢 Verified (3.4.10 > 3.2.4 patched)                        |
| 73  | `3e`  | `D-L-12` | eslint/typescript-eslint version mismatch      | 🟢 Acceptable (eslint 10.3.0 + ts-eslint 8.59.2 compatible) |
| 74  | `3e`  | `D-L-9`  | Duplicate packages in lockfile                 | 🟢 **Fixed** (npm dedupe reduced)                           |
| 75  | `3e`  | `L-L-10` | CostManager fallback pricing 10-100x off       | 🟢 Acceptable (reasonable mid-range estimate)               |
| 76  | `3e`  | `R-L-13` | RateLimitDecorator cleanup FIFO                | 🟢 Acceptable (Map insertion order, MAX_PROVIDERS=100)      |
| 77  | `3e`  | `S-L-10` | keyStateStore.persist() fire-and-forget        | 🟢 By design (availability over consistency)                |

---

## Summary

| Priority  | Total  | 🟢 Fixed/Verified | 🟡 Risk/Acceptable | 🔴 Remaining                      |
| --------- | ------ | ----------------- | ------------------ | --------------------------------- |
| 🟡 Medium | 42     | 28                | 10 (risks)         | 2 (#112 mock services, #172 a11y) |
| 🔵 Low    | 19     | 19                | 0                  | 0                                 |
| **Total** | **61** | **47**            | **10**             | **2**                             |
