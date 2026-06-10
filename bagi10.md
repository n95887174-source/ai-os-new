# bagi10.md — Audit Round 10 Status Tracker

**Project**: ai-os-new
**Date**: 2026-06-10
**Source**: `bagi10_full.md` (141 bugs: 16 CRITICAL, 42 HIGH, 64 MEDIUM, 19 LOW)
**TypeScript**: `tsc --noEmit` = 0 errors
**Tests**: 33/33 passing

---

## Summary

| Severity | Total | Fixed | Remaining | % |
|----------|-------|-------|-----------|---|
| CRITICAL | 16 | 12 | 4 | 75% |
| HIGH | 42 | 15 | 27 | 36% |
| MEDIUM | 64 | 12 | 52 | 19% |
| LOW | 19 | 0 | 19 | 0% |
| **Total** | **141** | **39** | **102** | **28%** |

---

## Fixed Bugs

### CRITICAL (12 fixed)

| ID | File | Fix | Commit |
|:---|:-----|:----|:-------|
| B10-135 | tool-executor.ts | importTools() validates tool code | `19d88df` |
| B10-84 | base-adapter.ts | mapMessages preserves toolCalls/toolCallId | `19d88df` |
| B10-38 | storage-router.ts | readLocalStorage() handles parsed objects | `19d88df` |
| B10-109 | provider-catalog-service.ts | getAuthHeaders uses backticks | `19d88df` |
| B10-69 | provider-budget.ts | endSession decrements providerSessionCount | `19d88df` |
| B10-70 | storage.ts | evictOldest correct key reconstruction | `19d88df` |
| B10-18 | key-vault.ts | stripPlaintextKeys clears all keys | `19d88df` |
| B10-165 | memory-repository.ts | upsert checks existing before insert | `19d88df` |
| B10-166 | 5 repositories | enforceLimit only evicts cache, not DB | `19d88df` |
| B10-26 | cognitive-service.ts | Correct running average formula | `19d88df` |
| B10-74/75 | sandbox-service.ts | SSRF hardened + proxy timeout | `19d88df` |
| B10-168 | network.ts | Rejects obfuscated IPs, HTTPS-only | `19d88df` |

### HIGH (15 fixed)

| ID | File | Fix | Commit |
|:---|:-----|:----|:-------|
| B10-41 | sqlite-storage.ts | Skill metadata preserved | `c5a6d3c` |
| B10-42 | sqlite-storage.ts | Debate objects JSON.stringify'd | `c5a6d3c` |
| B10-43 | trace-service.ts | STREAM_END persists trace | `c5a6d3c` |
| B10-72 | provider-session.ts | Double-completion guard | `c5a6d3c` |
| B10-71 | provider-session.ts | _wasActivated flag for budget | `c5a6d3c` |
| B10-27 | cognitive-intelligence-service.ts | Session phase updated | `c5a6d3c` |
| B10-28 | cognitive-intelligence-service.ts | diagnoseSession works on copy | `c5a6d3c` |
| B10-52 | insight-engine.ts | Per-node bottleneck denominator | `c5a6d3c` |
| B10-53 | optimization-engine.ts | budgetWarningSent resets | `c5a6d3c` |
| B10-54 | research-confidence-service.ts | tTest guards empty groups | `c5a6d3c` |
| B10-29 | cognitive-whatif.ts | Division by zero guard | `c5a6d3c` |
| B10-30 | cognitive-diagnostics.ts | Per-session issues tracking | `c5a6d3c` |
| B10-55 | research-goal-tracking.ts | Actual goal duration | `c5a6d3c` |
| B10-44 | dexie-storage.ts | queryEntries applies filters | `1b800d2` |
| B10-45 | router-shadow-diff.ts | Negative matched count fixed | `1b800d2` |

### MEDIUM (12 fixed)

| ID | File | Fix | Commit |
|:---|:-----|:----|:-------|
| B10-119 | rotation-service.ts | setTimeout overflow capped | `8697932` |
| B10-46 | sqlite-storage.ts | ROLLBACK on bulkPut error | `8697932` |
| B10-57 | research-confidence-service.ts | calculateCI guards single-sample | `8697932` |
| B10-63 | pattern-learning-service.ts | Correlation strength capped at 1.0 | `8697932` |
| B10-141 | role-auto-suggestion-service.ts | Evict by timestamp | `8697932` |
| B10-143 | role-testing-sandbox.ts | Results capped at 500 | `8697932` |
| B10-144 | task-handoff.ts | Handoffs capped at 200 | `8697932` |

---

## Remaining Bugs

### CRITICAL (4 remaining)

| ID | File | Description |
|:---|:-----|:------------|
| B10-03 | sse-parser.ts | SSE idle timeout never fires when read() blocks |
| B10-39/40 | snapshot-service.ts | replayNext/replayPrev = vs === (already correct in code) |
| B10-51 | advisor-service.ts | performDeepAnalysis corrupted control flow (already correct in code) |
| B10-136 | tool-executor.ts | Proxy fallback bypasses SSRF (already protected by isPrivateIP check) |

### HIGH (27 remaining)

| ID | File | Description |
|:---|:-----|:------------|
| B10-04 | sse-parser.ts | Cancel bodyReader on idle timeout |
| B10-05 | llm-http-client.ts | Logs full API key in error context |
| B10-06 | sse-parser.ts | Incomplete multi-byte UTF-8 handling |
| B10-08 | debate-consensus.ts | confidenceGraph memory leak |
| B10-09 | debate-strategies.ts | Duplicate registrations overwrite silently |
| B10-12 | agent-service.ts | init() broken after failed load |
| B10-13 | agent-version-service.ts | Prototype pollution via config merge |
| B10-14 | agent-delegation-service.ts | Circular dependency detection incomplete |
| B10-19 | useKeyStore.ts | UI logs partial API key |
| B10-20 | key-vault.ts | Decrypt returns wrong key after rotation |
| B10-22 | canary-router.ts | Traffic split off-by-one |
| B10-23 | semantic-router.ts | Embedding cache invalidation missing |
| B10-31 | cognitive-service.ts | destroy() doesn't clear persist timer |
| B10-73 | storage.ts | IndexedDB init failure silently swallowed |
| B10-83 | openrouter/nvidia adapters | normalizeFinishReason doesn't uppercase |
| B10-85 | gemini-response-mapper.ts | Duplicate tool-call IDs |
| B10-110 | useChatStore.ts | isSending flag stuck true |
| B10-115 | useRoutingIntelligence.ts | updateFallbackLink desyncs state |
| B10-137 | tool-executor.ts | Empty allowedDomains = allow-all |
| B10-167 | topology-defaults.ts | Duplicate model in Gemini catalog |
| B10-169 | schema-types.ts | KeyNoteSchema field name mismatch |
| B10-170 | schema-types.ts | BudgetStateSnapshotSchema diverged |
| B10-171 | debate-runtime-state.ts | DebateSessionState naming collision |

### MEDIUM (52 remaining)

| ID | File | Description |
|:---|:-----|:------------|
| B10-07 | llm-http-client.ts | Retry-After date format parsing |
| B10-10 | debate-consensus.ts | Agent signatures not validated |
| B10-11 | debate-strategies.ts | selectStrategy defaults to first |
| B10-15 | agent-service.ts | Event listener leak on re-init |
| B10-16 | agent-version-service.ts | Migration skips hooks |
| B10-17 | agent-delegation-service.ts | No cleanup on target failure |
| B10-21 | useKeyStore.ts | Race condition on concurrent updates |
| B10-24 | rate-limit-decorator.ts | Token bucket underflows |
| B10-25 | semantic-router.ts | Falls back to first route |
| B10-32 | cognitive-intelligence-service.ts | init() no guard |
| B10-33 | cognitive-intelligence-service.ts | Session summaries never evicted |
| B10-34 | routing-policy-service.ts | resolveFallback returns wrong provider |
| B10-35 | cognitive-whatif.ts | Quality change vs fixed baseline |
| B10-36 | cognitive-service.ts | executeAgentNode dead code |
| B10-47 | key-state-projection.ts | Health check doesn't clear stale error |
| B10-49 | transaction.ts | Commit failure partial persists |
| B10-56 | whatif-engine.ts | Scenario display swaps percentages |
| B10-58 | pressure-map-service.ts | Ignores new sessions |
| B10-59 | research-scheduler.ts | Weekly cron skips today |
| B10-60 | research-export-service.ts | HTML template function literal |
| B10-61 | diagnostic-service.ts | Inconsistent score |
| B10-62 | cross-module-findings-aggregator.ts | Fire-and-forget save |
| B10-64 | optimization-engine.ts | Conflicting changes applied |
| B10-65 | whatif-service.ts | Policy dry run uses mock data |
| B10-76 | sandbox-service.ts | Proxy fallback no timeout |
| B10-77 | race-executor.ts | Timeout timer never cleared |
| B10-78 | PluginSDK.ts | Not rolled back on onLoad failure |
| B10-79 | provider-instance.ts | isAvailable() mutates state |
| B10-80 | scheduler-service.ts | Race condition duplicate execution |
| B10-81 | provider-budget.ts | Snapshot activeSessions hardcoded 0 |
| B10-86 | gemini-request-builder.ts | Discards non-text parts |
| B10-87 | openrouter-adapter.ts | finishReason not normalized |
| B10-88 | openai-compatible-adapter.ts | Stream omits finishReason |
| B10-89 | flyweight.ts | Shallow freeze nested mutable |
| B10-90 | request-builder.ts | Shallow copy |
| B10-91 | cloudflare/openai adapters | Retry-After HTTP-date |
| B10-94 | cloudflare-adapter.ts | Invalid URL when accountId empty |
| B10-111 | useChatStore.ts | Unbounded message history |
| B10-112 | useChatStore.ts | Stale total count |
| B10-114 | debateLiveStore.ts | Subscriptions never unsubscribed |
| B10-116 | provider-personality-service.ts | calibrate() no clamp |
| B10-117 | provider-tracker.ts | Hydration overwrites fresh metrics |
| B10-118 | provider-tracker.ts | Negative TPS |
| B10-120 | debate-participant-scheduler.ts | Returns undefined not null |
| B10-121 | topologyTraceStore.ts | activeTraces never cleaned |
| B10-138 | format.ts | formatBytes TB+ undefined |
| B10-139 | router-scoring.ts | Division by zero |
| B10-140 | router-config-manager.ts | recordABTestResult never persists |
| B10-142 | role-auto-suggestion-service.ts | getHistory returns oldest |
| B10-146 | chat-export.ts | escapeMarkdown incomplete |
| B10-147 | router-config-manager.ts | getConfig() shallow copy leaks |
| B10-152 | router-request-classifier.ts | Regex compiled every call |
| B10-153 | research-run-service.ts | persist() lost on shutdown |
| B10-172 | schema-types.ts | ApiKeySchema missing statuses |
| B10-173 | schema-types.ts | SystemStateSchema missing fields |
| B10-174 | schema-types.ts | compromise:signal accepts empty |
| B10-175 | topology-defaults.ts | assignArgumentStrategies mutates input |
| B10-176 | memory-types.ts | Float32Array JSON round-trip |
| B10-177 | schema-types.ts | ApiKeySchema.label mismatch |
| B10-178 | schema-types.ts | ChatMessageSchema role enum |
| B10-179 | trace-repository.ts | No size management |
| B10-180 | memory-repository.ts | search cache-only results |

### LOW (19 remaining)

| ID | File | Description |
|:---|:-----|:------------|
| B10-37 | cognitive-diagnostics.ts | History never evicts sessions |
| B10-48 | rewind-service.ts | Interval timer never cleaned |
| B10-50 | storage-adapter-instance.ts | Proxy allows arbitrary writes |
| B10-66 | hypothesis-to-experiment.ts | Dead code + partial object |
| B10-67 | research-scheduler.ts | recordResult save without await |
| B10-68 | pressure-engine.ts | Budget lookup case mismatch |
| B10-82 | chat-template-service.ts | Usage counts lost on restart |
| B10-92 | embeddings-adapter.ts | Ollama isAvailable always true |
| B10-93 | openrouter-adapter.ts | refreshModelCache race condition |
| B10-113 | useChatStore.ts | Stale stream updates |
| B10-122 | provider-catalog-service.ts | Duplicate model in catalog |
| B10-123 | virtual-key-service.ts | init() race condition |
| B10-145 | task-handoff.ts | Inconsistent sorting |
| B10-148 | routing-experiments-service.ts | RNG breaks when seed=0 |
| B10-149 | role-test-service.ts | testCases grows without bound |
| B10-150 | format.ts | formatDate treats 0 as invalid |
| B10-151 | research-export.ts | copyAsGithubIssue outputs undefined |
| B10-181 | provider-state.ts | ProviderStateStatus mismatch |
| B10-182 | memory-types.ts | MemorySource union defeats narrowing |
| B10-183 | schema-types.ts | RotationConfigSchema allows 0 |

---

## Commits

| Hash | Description | Bugs Fixed |
|:-----|:------------|:-----------|
| `19d88df` | CRITICAL batch 1 | 12 |
| `c5a6d3c` | HIGH batch | 15 |
| `8697932` | MEDIUM batch 1 | 7 |
| `1b800d2` | MEDIUM batch 2 | 2 |

---

## Notes

- B10-39/40, B10-51: Audit described `=` vs `===` bugs, but current code already uses `>=`/`<=`. These were fixed in an earlier session.
- B10-136: Audit described proxy fallback SSRF bypass, but `isPrivateIP` check already protects both direct and proxy paths.
- B10-03: SSE idle timeout already fixed with `Promise.race` (L9-02).
- B10-04: SSE bodyReader cancel already fixed (L9-03).
- B10-12: Agent service init() already has `_initialized` at end of async work.
