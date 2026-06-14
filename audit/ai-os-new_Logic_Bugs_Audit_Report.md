# Logic Bugs Audit Report — ai-os-new Codebase

**73 findings**

## Severity Distribution

| Severity | Count |
|----------|-------|
| CRITICAL | 7 |
| HIGH | 21 |
| MEDIUM | 35 |
| LOW | 10 |
| **TOTAL** | **73** |

## Finding Categories

| Category | Count |
|----------|-------|
| Incorrect Calculation / Aggregation | 12 |
| Broken Invariants / State Machine Violations | 11 |
| Incorrect Branching / Conditionals | 10 |
| Silent Failure Paths | 8 |
| Wrong Default Values / Falsy Bugs | 7 |
| Unit Mismatch / Wrong Comparisons | 7 |
| Missing State Transitions | 5 |
| Index Misalignment / Off-by-One | 5 |
| Implementation Does Not Match Name/Intent | 5 |
| Duplicated Logic / Dead Code | 3 |

---

## All Findings

| ID | Sev | Title | File(s) |
|----|-----|-------|---------|
| LG-01 | CRITICAL | Budget threshold double-counts current request cost | src/kernel/services/budget-service.ts:57-68 |
| LG-02 | CRITICAL | Cost Manager treats totalTokens as outputTokens, inflating cost up to 3x | src/llm/decorators/cost-manager.ts:174,206-207 |
| LG-03 | CRITICAL | RaceExecutor resolves to failure if fastest candidate fails, ignoring slower successes | src/kernel/services/race-executor.ts:61-91 |
| LG-04 | CRITICAL | TaskQueue permanently stalls when throttle is enabled | src/core/TaskQueue.ts:72-103 |
| LG-05 | CRITICAL | Paused debate session emits spurious CONSENSUS_REACHED and corrupts abort flag | src/kernel/services/debate-runtime/debate-engine.ts:293-307; src/kernel/services/debate-runtime/debate-session.ts:18 |
| LG-06 | CRITICAL | Lost final fallback on 429 retry exhaustion | src/kernel/services/chat-service.ts:382-408,420 |
| LG-07 | CRITICAL | Counterfactual key overrides applied to ALL providers | src/kernel/services/counterfactual-engine.ts:18-29 |
| LG-08 | HIGH | updateMetricsFromResponse uses hardcoded $0.01/M-token instead of pricing service | src/kernel/services/key-management/key-analytics.ts:190-196 |
| LG-09 | HIGH | Falsy-value bug: inputTokens:0 silently overridden to estimate | src/kernel/services/key-management/key-analytics.ts:121-122 |
| LG-10 | HIGH | getSpendSummary reports remaining:0 for providers with no budget set | src/kernel/services/budget-service.ts:123 |
| LG-11 | HIGH | checkQuotas emits wrong quota type 'tokens' for budget breach | src/kernel/services/key-management/key-quotas.ts:103 |
| LG-12 | HIGH | Rate limit decorator wastes global token when per-provider limit rejects | src/llm/decorators/rate-limit-decorator.ts:98-121 |
| LG-13 | HIGH | Compress route index misalignment drops toolCalls on drop-system strategy | src/llm/decorators/compress-route.ts:65-74 |
| LG-14 | HIGH | Cost manager record truncation causes budget under-reporting | src/llm/decorators/cost-manager.ts:119-124 |
| LG-15 | HIGH | VALID_TRANSITIONS missing paused→queued, breaking debate resume flow | src/kernel/services/debate-runtime/debate-session.ts:18; src/kernel/services/debate-runtime/debate-engine.ts:187-189 |
| LG-16 | HIGH | Evaluator overall score dominated by unbounded argumentCount * 0.05 | src/kernel/services/debate-runtime/debate-evaluator.ts:25-31 |
| LG-17 | HIGH | isContradictory flags any two different bare numbers as contradictions | src/kernel/services/debate-runtime/debate-consensus.ts:175-182 |
| LG-18 | HIGH | Governor shouldStop() returns true when no contradictions exist, causing premature termination | src/kernel/services/debate-governor/debate-governor.ts:174-186 |
| LG-19 | HIGH | Cross-tab primary election always returns true (base-36 vs base-10 parsing) | src/kernel/services/cross-tab-state.ts:101-104,307-315 |
| LG-20 | HIGH | Orchestration rate limiter compares token count to monetary cost (units mismatch) | src/kernel/services/orchestration-service.ts:380-383 |
| LG-21 | HIGH | Rate limit token/cost counters are never reset daily | src/kernel/services/orchestration-service.ts:380-396 |
| LG-22 | HIGH | EventRecorder.record() uses different timestamps for event and checksum | src/kernel/services/event-sourcing/event-recorder.ts:75-81 |
| LG-23 | HIGH | Transaction.commit() resets _committed=false during failure, allowing interleaved mutations | src/kernel/services/transaction.ts:48,56,19 |
| LG-24 | HIGH | Sequential config updates overwrite each other in live state | src/kernel/services/config-service.ts:117-118 |
| LG-25 | HIGH | Streaming adapterMeta overwrites accumulated content | src/kernel/services/llm-client-service.ts:79-84 |
| LG-26 | HIGH | previousState always equals state in KEY_STATE_CHANGED event | src/kernel/services/group-manager.ts:228-234 |
| LG-27 | HIGH | NaN reliability score when recent counts are zero | src/kernel/services/health-score-service.ts:190-192 |
| LG-28 | HIGH | Inherited permissions ignored in role conflict detection | src/kernel/services/role-conflict-detection-service.ts:40-41 |
| LG-29 | MEDIUM | Scoring components raw already includes duplicated bonuses | src/kernel/services/provider-router.ts:525-550 |
| LG-30 | MEDIUM | getBurstCapacity double-counts shared group key capacity | src/kernel/services/key-management/key-pool-selector.ts:126-138 |
| LG-31 | MEDIUM | Virtual key created with empty provider when real key ID does not exist | src/kernel/services/virtual-key-service.ts:48-62 |
| LG-32 | MEDIUM | ProviderBudget.endSession decrements sessionCount, losing historical record | src/kernel/services/provider-runtime/provider-budget.ts:89-95 |
| LG-33 | MEDIUM | KeyLifecycle onSuccess does not clear successCounters after recovering→active transition | src/kernel/services/key-management/key-lifecycle.ts:111-121 |
| LG-34 | MEDIUM | checkProviderBudget uses startsWith for provider matching, causing false positives | src/kernel/services/pricing-service.ts:325-327 |
| LG-35 | MEDIUM | weightedTokens always equals tokens, making the field redundant | src/kernel/services/key-management/key-analytics.ts:116 |
| LG-36 | MEDIUM | SSE dataAccumulator lost across pull() calls for multi-line events | src/llm/http/sse-parser.ts:84 |
| LG-37 | MEDIUM | SSE consecutive data: fields joined without newline (spec violation) | src/llm/http/sse-parser.ts:116-120 |
| LG-38 | MEDIUM | Resumable stream resume() yields duplicate content with misleading indices | src/llm/streaming/resumable-stream.ts:268-366 |
| LG-39 | MEDIUM | OpenRouter/Nvidia missing LENGTH→MAX_TOKENS finish reason normalization | src/llm/openrouter/openrouter-adapter.ts:16-22; src/llm/nvidia/nvidia-nim-adapter.ts:15-21 |
| LG-40 | MEDIUM | Canary router checkHealth returns candidate health even when primary is healthy | src/llm/decorators/canary-router.ts:165-169 |
| LG-41 | MEDIUM | batchSendMessage silently returns empty array when inner does not support it | src/llm/core/base-decorator.ts:43-46 |
| LG-42 | MEDIUM | Round advancement counts duplicate arguments toward participant threshold | src/kernel/services/debate-service.ts:407-409 |
| LG-43 | MEDIUM | Governor not fed opening statements (round 0) | src/kernel/services/debate-service.ts:179-215,378 |
| LG-44 | MEDIUM | inferRelation requires BOTH texts to match contradiction pattern | src/kernel/services/debate-runtime/debate-memory-graph.ts:148 |
| LG-45 | MEDIUM | Branch merge marks target merged but does not update target's arguments | src/kernel/services/debate-runtime/debate-branching.ts:74-79 |
| LG-46 | MEDIUM | Agent loop does not check for paused phase mid-round | src/kernel/services/debate-runtime/debate-engine.ts:208 |
| LG-47 | MEDIUM | Resume flow emits SESSION_STARTED instead of SESSION_RESUMED | src/kernel/services/debate-runtime/debate-engine.ts:191,545-557 |
| LG-48 | MEDIUM | Convergence score biased low by cross-agent sequential comparison | src/kernel/services/debate-stop-conditions.ts:50-63 |
| LG-49 | MEDIUM | HealingPlan summary counts always zero, never updated after execution | src/kernel/services/consistency-checker.ts:244-256 |
| LG-50 | MEDIUM | DowngradeStrategy compares cost-per-request against cost-per-1k-tokens (unit mismatch) | src/kernel/services/downgrade-strategy.ts:56-59 |
| LG-51 | MEDIUM | LifecycleManager tryInit() interprets retries as total attempts, not retry count | src/kernel/services/lifecycle-manager.ts:55-71 |
| LG-52 | MEDIUM | SnapshotService.restore() does not restore disabled nodes state | src/kernel/services/snapshot-service.ts:116-153 |
| LG-53 | MEDIUM | SafetyContract weight normalization can produce negative weights | src/core/SafetyContract.ts:23-27 |
| LG-54 | MEDIUM | SystemKernel.init() caches rejected promise, preventing retry | src/kernel/kernel.ts:53 |
| LG-55 | MEDIUM | Similarity score incorrectly divided by component count | src/kernel/services/agent-similarity-service.ts:166-196 |
| LG-56 | MEDIUM | Hardcoded 'role' string instead of actual role ID in cognitive service | src/kernel/services/cognitive-service.ts:362 |
| LG-57 | MEDIUM | byRequestId index becomes inconsistent after eviction | src/kernel/services/message-index-service.ts:128-131 |
| LG-58 | MEDIUM | prune() dryRun omits importanceBelow details | src/kernel/services/memory-engine.ts:388-396 |
| LG-59 | MEDIUM | False-positive 429 detection from substring match | src/kernel/services/chat-service.ts:380 |
| LG-60 | MEDIUM | STREAM_END handler does not update latency/token averages | src/kernel/services/agent-service.ts:139-152 |
| LG-61 | MEDIUM | computeId collisions when metadata is undefined | src/kernel/services/memory-engine.ts:229 |
| LG-62 | MEDIUM | Legacy stop conditions unreachable (governor always instantiated) | src/kernel/services/debate-service.ts:135,389-404 |
| LG-63 | MEDIUM | classifyNodeType dead branch for round===0 | src/kernel/services/debate-runtime/debate-compiler.ts:93-94 |
| LG-64 | LOW | Budget-penalized keys added to skipped list but not actually excluded | src/kernel/services/provider-router.ts:540-543 |
| LG-65 | LOW | Bidirectional prefix matching returns wrong pricing for novel model variants | src/kernel/services/pricing-service.ts:156-158 |
| LG-66 | LOW | Circuit breaker dead-code no-op inFlightHalfOpen reset | src/llm/decorators/circuit-breaker.ts:77-79 |
| LG-67 | LOW | DebateRoom.start() sets room state to active after session completes | src/kernel/services/debate-runtime/debate-room.ts:64-84 |
| LG-68 | LOW | detectChallenges skips same-round claims, missing immediate rebuttals | src/kernel/services/debate-governor/claim-graph.ts:33 |
| LG-69 | LOW | Asymmetric overlap denominator inflates contradiction detection | src/kernel/services/debate-governor/contradiction-detector.ts:48-50 |
| LG-70 | LOW | RewindService.undo() returns partial messages, not full pre-rewind state | src/kernel/services/rewind-service.ts:148-181 |
| LG-71 | LOW | completedNodes increments for both success and error | src/kernel/services/orchestration-service.ts:199,207 |
| LG-72 | LOW | Agent delegation MAX_TASKS only limits completed/failed tasks | src/kernel/services/agent-delegation-service.ts:140-147 |
| LG-73 | LOW | storeBatch creates DB/in-memory inconsistency | src/kernel/services/memory-engine.ts:258-275 |

---

## Detailed Findings

### LG-01 CRITICAL — Budget threshold double-counts current request cost

**Files:** `src/kernel/services/budget-service.ts:57-68`

**Logic Error:** In the STREAM_END handler, `calculateCost()` synchronously pushes the cost into `PricingService.costHistory`. Then `getGlobalSpend()` reads `costHistory` (now including the current request). Adding `+cost` on top counts the same request twice. Budget alerts fire at roughly 50% actual spend, and provider budget over-limit is detected prematurely.

**Fix:** Capture spend and provider spend BEFORE calling `calculateCost()`, then add the new cost to the pre-calculation values for threshold checking.

---

### LG-02 CRITICAL — Cost Manager treats totalTokens as outputTokens, inflating cost up to 3x

**Files:** `src/llm/decorators/cost-manager.ts:174,206-207`

**Logic Error:** All adapters populate `ProviderResponse.tokens` with the total token count (input + output). The cost manager reads this as `outputTokens`. `calculateCost()` then computes (inputTokens/1000)*inputRate + (outputTokens/1000)*outputRate. Input tokens are double-counted: once at the input rate and again at the typically 4x higher output rate. Example: 800 input + 200 output at $0.002/$0.008 rates: correct = $0.0032, actual = $0.0096 (3x overcharge).

**Fix:** Compute `outputTokens = Math.max(0, totalTokens - inputTokens)` before passing to `calculateCost()`. For streaming, use `total_tokens` from usage metadata similarly.

---

### LG-03 CRITICAL — RaceExecutor resolves to failure if fastest candidate fails, ignoring slower successes

**Files:** `src/kernel/services/race-executor.ts:61-91`

**Logic Error:** `Promise.race()` resolves with the first settled promise. Each candidate's `.catch()` converts rejection to `null` resolution. If candidate A fails in 10ms (resolves to `null`) while candidate B succeeds in 100ms, `racePromise` resolves to `null` immediately. The `if(!result)` check then throws 'All race candidates failed' even though candidate B would have succeeded.

**Fix:** Replace `Promise.race` with a first-success pattern: only resolve on success, count failures, and reject only when all candidates have failed.

---

### LG-04 CRITICAL — TaskQueue permanently stalls when throttle is enabled

**Files:** `src/core/TaskQueue.ts:72-103`

**Logic Error:** In `processNext()`, after the microtask's `run()` exits the while-loop due to throttle (elapsed < throttleMs), the code checks `queue.length > 0` and calls `processNext()`. But `this.processing` is still `true`, so the guard returns immediately. The `else` branch (which sets `processing=false`) is never reached. All subsequent calls to `processNext()` also return immediately, permanently stalling the queue.

**Fix:** Set `processing=false` before recursing, or schedule a delayed retry when throttled: `this.processing=false; setTimeout(() => this.processNext(), waitMs)`.

---

### LG-05 CRITICAL — Paused debate session emits spurious CONSENSUS_REACHED and corrupts abort flag

**Files:** `src/kernel/services/debate-runtime/debate-engine.ts:293-307`, `src/kernel/services/debate-runtime/debate-session.ts:18`

**Logic Error:** When `pauseSession()` is called while `startSession()` is running, the orchestrator loop exits on abort. After the loop, line 295 only checks for `completed`/`failed`/`cancelled`, not `paused`. The session is paused so the guard passes through. Then `clearAbort` destroys the flag `resumeSession` depends on, `session.transition('consensus')` silently fails (paused→consensus is invalid), but execution continues to emit `CONSENSUS_REACHED` for a paused session.

**Fix:** Add `'paused'` to the early-return guard at line 295, and move `clearAbort` inside the non-paused branch so the abort flag is preserved for resume.

---

### LG-06 CRITICAL — Lost final fallback on 429 retry exhaustion

**Files:** `src/kernel/services/chat-service.ts:382-408,420`

**Logic Error:** When a 429 error occurs on the last allowed retry (depth = MAX_429_RETRIES - 1), the code prepares a fallback provider and increments depth. But the while loop condition (`depth < MAX_429_RETRIES`) then fails, so the fallback request is never executed. The code falls through and emits an error despite having found a valid fallback.

**Fix:** Restructure the loop to use `continue` after preparing the fallback so the new request is actually tried, or change the depth check to allow one more iteration for the fallback.

---

### LG-07 CRITICAL — Counterfactual key overrides applied to ALL providers

**Files:** `src/kernel/services/counterfactual-engine.ts:18-29`

**Logic Error:** In `applyOverrides`, when `overrides.keys` is provided, the inner loop `for(const providerId of Object.keys(state.providers))` applies every key override to every provider. If you override key A (belonging to provider X) with `rateLimited:true`, it sets reliability = 0 for providers X, Y, and Z. This produces wildly incorrect simulation results when multiple providers exist.

**Fix:** The key override should only apply to the provider that the key belongs to. Look up the specific provider from the override data instead of iterating all providers.

---

### LG-08 HIGH — updateMetricsFromResponse uses hardcoded $0.01/M-token instead of pricing service

**Files:** `src/kernel/services/key-management/key-analytics.ts:190-196`

**Logic Error:** On the `res.status === 'done'` path, cost is computed as `(tokens / 1_000_000) * 0.01`, a flat $0.01 per million tokens regardless of model. By contrast, `recordUsage()` correctly uses `pricingService.calculateCost()`. This causes `estimatedCost` and `usageToday.estimatedCost` to be wildly wrong for expensive models like GPT-4 at $30/$60 per M tokens.

**Fix:** Use `this.deps.pricingService.calculateCost(key.stats.lastModel || 'default', inputTokens, tokens)` consistently.

---

### LG-09 HIGH — Falsy-value bug: inputTokens:0 silently overridden to estimate

**Files:** `src/kernel/services/key-management/key-analytics.ts:121-122`

**Logic Error:** `extExtra?.inputTokens || Math.round(tokens * 0.3)` uses `||` (logical OR). When `inputTokens` is explicitly 0 (valid for embedding-only or zero-input calls), 0 is falsy so it falls back to the estimate. Same bug for `outputTokens || tokens`: `outputTokens:0` is overridden to the full tokens value. This overestimates costs and distorts token accounting.

**Fix:** Replace `||` with `??` (nullish coalescing): `extExtra?.inputTokens ?? Math.round(tokens * 0.3)` and `extExtra?.outputTokens ?? tokens`.

---

### LG-10 HIGH — getSpendSummary reports remaining:0 for providers with no budget set

**Files:** `src/kernel/services/budget-service.ts:123`

**Logic Error:** When a provider has no budget configured (`monthlyBudget <= 0`), `PricingService.getBudgetInfo()` sets `remainingBudget = Number.MAX_SAFE_INTEGER` as a sentinel. But `getSpendSummary()` converts this to 0: `remaining: p.remainingBudget === MAX_SAFE_INTEGER ? 0 : p.remainingBudget`. Any downstream logic checking `remaining > 0` incorrectly treats unbudgeted providers as out of budget.

**Fix:** Return `Infinity` (or -1 as a documented sentinel) instead of 0 for unbudgeted providers.

---

### LG-11 HIGH — checkQuotas emits wrong quota type 'tokens' for budget breach

**Files:** `src/kernel/services/key-management/key-quotas.ts:103`

**Logic Error:** When monthly budget is exceeded, `onQuotaExceeded` is called with quota type `'tokens'` instead of `'cost'` or `'budget'`. Downstream handlers (e.g., `KeyRotationPolicyService`) incorrectly interpret this as a token quota breach, potentially triggering wrong remediation.

**Fix:** Change the quota type from `'tokens'` to `'cost'`.

---

### LG-12 HIGH — Rate limit decorator wastes global token when per-provider limit rejects

**Files:** `src/llm/decorators/rate-limit-decorator.ts:98-121`

**Logic Error:** `checkRate()` consumes a global token first. If the per-provider bucket then rejects, the global token is irrevocably consumed but the request is denied. Under load with one saturated provider, this exhausts the global bucket, blocking all other providers.

**Fix:** Check per-provider capacity first (non-consuming peek), then consume global token, then consume per-provider token.

---

### LG-13 HIGH — Compress route index misalignment drops toolCalls on drop-system strategy

**Files:** `src/llm/decorators/compress-route.ts:65-74`

**Logic Error:** When strategy is `drop-system`, `compressMessages()` filters out system messages, producing a shorter array. The post-processing map indexes into `original[]` by position, causing misalignment. `compressed[0]` (user) maps to `original[0]` (system), and the assistant's `toolCalls` from `original[2]` are silently lost.

**Fix:** Match by role+content instead of index, or build a lookup from original messages before compression.

---

### LG-14 HIGH — Cost manager record truncation causes budget under-reporting

**Files:** `src/llm/decorators/cost-manager.ts:119-124`

**Logic Error:** When `records.length > 100000`, the array is sliced to the last 50000 entries, silently discarding cost history. The `checkBudget()` method sums remaining records. After truncation, historical spending is lost, so the budget check can report spending is under limit when it is actually exceeded.

**Fix:** Track cumulative cost in a separate variable that is never truncated, or compute budget from an untruncated accumulator.

---

### LG-15 HIGH — VALID_TRANSITIONS missing paused→queued, breaking debate resume flow

**Files:** `src/kernel/services/debate-runtime/debate-session.ts:18`, `src/kernel/services/debate-runtime/debate-engine.ts:187-189`

**Logic Error:** `VALID_TRANSITIONS` for `paused` is `['deliberating', 'failed', 'cancelled']`. When `resumeSession()` calls `startSession()`, it attempts `paused`→`queued`→`initializing`→`active`. All three transitions silently fail because `paused`→`queued` is invalid. The session eventually works via `paused`→`deliberating`, but never re-enters 'active' phase, phase-change listeners don't fire, and `SESSION_STARTED` is emitted instead of `SESSION_RESUMED`.

**Fix:** Add `'queued'` and `'active'` to the paused state's valid transitions: `paused: ['deliberating', 'queued', 'active', 'failed', 'cancelled']`.

---

### LG-16 HIGH — Evaluator overall score dominated by unbounded argumentCount * 0.05

**Files:** `src/kernel/services/debate-runtime/debate-evaluator.ts:25-31`

**Logic Error:** The formula `argumentCount * 0.05 + avgConfidence * 0.25 + coherence * 0.25 + persuasiveness * 0.25 + factuality * 0.2` has an unnormalized `argumentCount` term. With 20 arguments it contributes 1.0 alone, capping the score at 1.0 regardless of quality. A participant with 20 mediocre arguments outscores one with 3 excellent arguments.

**Fix:** Normalize: `const normalizedArgCount = Math.min(1, argumentCount / 10);` and use `normalizedArgCount * 0.05` in the formula.

---

### LG-17 HIGH — isContradictory flags any two different bare numbers as contradictions

**Files:** `src/kernel/services/debate-runtime/debate-consensus.ts:175-182`

**Logic Error:** The number-contradiction check extracts numbers and units via regex. When no unit is recognized, the unit defaults to `""`. The check `an.unit === bn.unit && an.val !== bn.val` then treats any two different bare numbers as contradictory. For example, '5 people attended' vs '3 options available' produces a false contradiction.

**Fix:** Skip the comparison when both units are empty: `if (an.unit === bn.unit && an.unit !== "" && an.val !== bn.val) return true;`

---

### LG-18 HIGH — Governor shouldStop() returns true when no contradictions exist, causing premature termination

**Files:** `src/kernel/services/debate-governor/debate-governor.ts:174-186`

**Logic Error:** `allCriticalContradictionsResolved()` returns `true` when there are zero open contradictions. A debate with 6 claims from non-overlapping domains would have no contradictions, triggering this condition and stopping the debate prematurely. No contradictions does not mean the debate is resolved; it means claims have not interacted yet.

**Fix:** Add a requirement that contradictions actually existed: `if (this.state.contradictions.length > 0 && this.allCriticalContradictionsResolved() && Object.values(this.state.graph.claims).length > 5)`.

---

### LG-19 HIGH — Cross-tab primary election always returns true (base-36 vs base-10 parsing)

**Files:** `src/kernel/services/cross-tab-state.ts:101-104,307-315`

**Logic Error:** `genId()` encodes `Date.now()` in base-36 (`Date.now().toString(36)`), producing tab IDs like `'m1abcde-1-a1b2c3d4'`. The parsing uses `parseInt(message.tabId.split('-')[0], 10)`, which interprets the base-36 string as base-10. Since base-36 digits include letters, `parseInt` returns `NaN`, which `|| 0` converts to 0. The guard `if(remoteTimestamp > 0)` fails, so no remote timestamps are stored. Every tab's `isPrimary()` returns `true`.

**Fix:** Change `parseInt` base: `parseInt(message.tabId.split('-')[0], 36)` instead of base 10.

---

### LG-20 HIGH — Orchestration rate limiter compares token count to monetary cost (units mismatch)

**Files:** `src/kernel/services/orchestration-service.ts:380-383`

**Logic Error:** `isRateLimited()` compares `tokensUsed` (estimated token count) against `rl.maxCostPerDay` (a monetary value in dollars/cent). These are different units. A cost threshold of $0.50 would never be reached by a token counter that increments by 1 per estimated token.

**Fix:** Track cost and tokens as separate counters. Use `maxCostPerDay` with a cost tracker and `maxTokensPerDay` with the token tracker.

---

### LG-21 HIGH — Rate limit token/cost counters are never reset daily

**Files:** `src/kernel/services/orchestration-service.ts:380-396`

**Logic Error:** `rateLimitTokens` is a monotonically increasing counter with no time-based reset. Once `tokensUsed == maxTokensPerDay`, the node is permanently rate-limited for the entire session, even after a day has passed.

**Fix:** Track token usage with timestamps (similar to call timestamps), or add a daily reset mechanism. Filter to last 24 hours when checking limits.

---

### LG-22 HIGH — EventRecorder.record() uses different timestamps for event and checksum

**Files:** `src/kernel/services/event-sourcing/event-recorder.ts:75-81`

**Logic Error:** In the standalone `record()` method, `Date.now()` is called twice, once for `timestamp` and once for `checksum`. If the clock advances between these calls (even by 1ms), the checksum will be computed with a different timestamp than what is recorded, causing verification failures.

**Fix:** Capture `Date.now()` once into a `const ts` variable and use it for both `timestamp` and checksum.

---

### LG-23 HIGH — Transaction.commit() resets _committed=false during failure, allowing interleaved mutations

**Files:** `src/kernel/services/transaction.ts:48,56,19`

**Logic Error:** On commit failure, `_committed` is reset to `false` so that `rollback()` can proceed. But during the async compensation phase, the guard in `deferEmit()`/`deferPersist()` (which checks `if (_committed || _rolledBack)`) now passes, allowing new items to be added to the transaction during its failure recovery. These new items are then cleared by `rollback()` without proper handling.

**Fix:** Use a separate `_committing` flag that blocks new deferred operations without preventing rollback.

---

### LG-24 HIGH — Sequential config updates overwrite each other in live state

**Files:** `src/kernel/services/config-service.ts:117-118`

**Logic Error:** Each `update*` method calls `setConfig` with `deepMerge(CONFIG.xxx, partial)`, merging the partial against the original `CONFIG`, not the accumulated overlay. After `updateMonitoring({a:1})` then `updateMonitoring({b:2})`, the live config has only `{b:2}` overlaid, losing `{a:1}`. On restart, `applyOverlays` correctly applies the accumulated overlay, so behavior diverges between runtime and restart.

**Fix:** Apply the accumulated overlay to live config: `setConfig('monitoring', deepMerge(CONFIG.monitoring, this.overlays.monitoring))` instead of just `partial`.

---

### LG-25 HIGH — Streaming adapterMeta overwrites accumulated content

**Files:** `src/kernel/services/llm-client-service.ts:79-84`

**Logic Error:** When streaming, the return object is `{ content, latency, tokens, ...adapterMeta }`. The spread `...adapterMeta` comes after `content`, so if `adapterMeta` contains a `content` field, it overwrites the accumulated content with a partial or transformed version.

**Fix:** Re-apply `content` after the spread: `{ ...adapterMeta, content }` to guarantee accumulated content wins.

---

### LG-26 HIGH — previousState always equals state in KEY_STATE_CHANGED event

**Files:** `src/kernel/services/group-manager.ts:228-234`

**Logic Error:** In `syncKeyStatus`, line 232 sets `p.status = status` BEFORE line 233 emits the event with `previousState: p.status`. Since `p.status` was already updated, `previousState` will always equal `state`, making the event's `previousState` field useless.

**Fix:** Capture the old status before updating: `const previousStatus = p.status;` then use `previousStatus` in the event.

---

### LG-27 HIGH — NaN reliability score when recent counts are zero

**Files:** `src/kernel/services/health-score-service.ts:190-192`

**Logic Error:** In `computeReliability`, when `totalCalls > 0` but `recentSuccesses + recentErrors === 0`, the computation `recentSuccesses / (recentSuccesses + recentErrors)` produces `0 / 0 = NaN`. This propagates through the formula making the entire health score `NaN`.

**Fix:** Guard the division: `const totalRecent = recentSuccesses + recentErrors; const successRate = totalRecent > 0 ? (recentSuccesses / totalRecent) * 100 : 80;`

---

### LG-28 HIGH — Inherited permissions ignored in role conflict detection

**Files:** `src/kernel/services/role-conflict-detection-service.ts:40-41`

**Logic Error:** `detectConflicts` builds `permsA = new Set(roleA.permissions)` and `permsB = new Set(roleB.permissions)`, completely ignoring `roleA.inherited` and `roleB.inherited`. If a role inherits `'chat:send'` from a parent but does not have it in `permissions`, and another role has `'chat:read-only'` in inherited, the contradiction is never detected.

**Fix:** Include inherited permissions: `const permsA = new Set([...roleA.permissions, ...roleA.inherited]);`

---

### LG-29 MEDIUM — Scoring components raw already includes duplicated bonuses

**Files:** `src/kernel/services/provider-router.ts:525-550`

**Logic Error:** `rawScore = calculateProviderScore(...)` already includes `stabilityBonus` and `reputationBonus`. These same bonuses are then computed again locally and stored as separate fields in `components`. If any consumer sums the components, the result will not equal the actual score.

**Fix:** Either have `calculateProviderScore` return only the weighted core and add bonuses separately, or remove duplicated bonuses from `components`.

---

### LG-30 MEDIUM — getBurstCapacity double-counts shared group key capacity

**Files:** `src/kernel/services/key-management/key-pool-selector.ts:126-138`

**Logic Error:** When `availableBurst <= 0` and group keys exist, the method iterates over each pool key, finds its group, and adds ALL group keys' capacity. If two pool keys belong to the same group, that group's capacity is added twice, overestimating available burst capacity.

**Fix:** Deduplicate groups first: `const seenGroups = new Set();` only process each group once.

---

### LG-31 MEDIUM — Virtual key created with empty provider when real key ID does not exist

**Files:** `src/kernel/services/virtual-key-service.ts:48-62`

**Logic Error:** In `create()`, if `getRealKey(realKeyId)` returns `undefined`, the virtual key's `provider` stays as `""`. This virtual key with empty provider is still persisted and can be resolved, causing errors in routing or cost attribution.

**Fix:** Throw an error if the real key is not found: `if (!keyData) throw new Error('Cannot create virtual key: real key not found');`

---

### LG-32 MEDIUM — ProviderBudget.endSession decrements sessionCount, losing historical record

**Files:** `src/kernel/services/provider-runtime/provider-budget.ts:89-95`

**Logic Error:** `providerSessionCount` is decremented in `endSession()`, making it a concurrent-session counter rather than total. After all sessions end, `sessionCount = 0`, losing the historical record. `providerActiveSessions` already correctly tracks concurrent sessions.

**Fix:** Do not decrement `providerSessionCount` in `endSession`. It should track total sessions started.

---

### LG-33 MEDIUM — KeyLifecycle onSuccess does not clear successCounters after recovering→active transition

**Files:** `src/kernel/services/key-management/key-lifecycle.ts:111-121`

**Logic Error:** When a key in `recovering` state accumulates enough successes to transition to `active`, `errorCounters` is deleted but `successCounters` is not. The `probation`→`active` path correctly deletes both. The stale success counter persists; if the key later enters probation, the old counter value is used as starting point.

**Fix:** Add `this.successCounters.delete(id)` alongside `this.errorCounters.delete(id)` in the `recovering`→`active` path.

---

### LG-34 MEDIUM — checkProviderBudget uses startsWith for provider matching, causing false positives

**Files:** `src/kernel/services/pricing-service.ts:325-327`

**Logic Error:** `(c.provider || c.model).toLowerCase().startsWith(provider.toLowerCase())` matches any cost entry whose provider/model starts with the given name. Checking provider `'open'` would incorrectly include `'openai'` costs.

**Fix:** Use exact match: `c.provider.toLowerCase() === provider.toLowerCase()`.

---

### LG-35 MEDIUM — weightedTokens always equals tokens, making the field redundant

**Files:** `src/kernel/services/key-management/key-analytics.ts:116`

**Logic Error:** `ext.usageToday.weightedTokens += tokens` adds the same raw token count as the `tokens` field. The name `weightedTokens` implies some weighting factor, but no weighting is applied. Downstream code relying on `weightedTokens` being different from `tokens` gets incorrect results.

**Fix:** Either apply a proper weighting factor (e.g., by model or input/output ratio) or remove the field.

---

### LG-36 MEDIUM — SSE dataAccumulator lost across pull() calls for multi-line events

**Files:** `src/llm/http/sse-parser.ts:84`

**Logic Error:** `dataAccumulator` is a local variable inside `pull()`. If a multi-field SSE event spans two reads, the accumulated data from the first read is discarded when `pull()` is re-entered. The buffer preserves incomplete raw lines, but the semantic accumulation of `data:` field content is lost.

**Fix:** Move `dataAccumulator` to the outer closure (same scope as `buffer`) so it persists across `pull()` calls.

---

### LG-37 MEDIUM — SSE consecutive data: fields joined without newline (spec violation)

**Files:** `src/llm/http/sse-parser.ts:116-120`

**Logic Error:** Per the SSE specification, multiple `data:` fields within a single event must be joined with `\n`. The code concatenates without any separator: `dataAccumulator += dataContent` instead of `dataAccumulator += '\n' + dataContent`.

**Fix:** Change to `dataAccumulator += '\n' + dataContent` when `dataAccumulator` is already non-empty.

---

### LG-38 MEDIUM — Resumable stream resume() yields duplicate content with misleading indices

**Files:** `src/llm/streaming/resumable-stream.ts:268-366`

**Logic Error:** `resume()` starts a brand-new HTTP request from the beginning but `resumeIndex` starts at `lastIndex+1`, giving chunks indices that continue from where the previous stream left off. The consumer sees sequentially-indexed chunks that actually duplicate earlier content.

**Fix:** Yield existing buffered chunks first, then only new content from the reconnected stream, or document that `resume` re-fetches and the consumer must deduplicate.

---

### LG-39 MEDIUM — OpenRouter/Nvidia missing LENGTH→MAX_TOKENS finish reason normalization

**Files:** `src/llm/openrouter/openrouter-adapter.ts:16-22`, `src/llm/nvidia/nvidia-nim-adapter.ts:15-21`

**Logic Error:** The OpenAI-compatible adapter correctly maps `'LENGTH'` → `'MAX_TOKENS'` and `'CONTENT_FILTER'` → `'SAFETY'`. OpenRouter and Nvidia adapters share the same protocol but lack these mappings. `finish_reason:'length'` is incorrectly mapped to `'OTHER'` instead of `'MAX_TOKENS'`.

**Fix:** Add the same normalization to both adapters: `if (upper === 'LENGTH') return 'MAX_TOKENS'; if (upper === 'CONTENT_FILTER') return 'SAFETY';`

---

### LG-40 MEDIUM — Canary router checkHealth returns candidate health even when primary is healthy

**Files:** `src/llm/decorators/canary-router.ts:165-169`

**Logic Error:** If the primary target is healthy but the candidate is unhealthy, `checkHealth` returns the candidate's error status. This makes the canary router appear globally unhealthy even though it can serve traffic via the primary.

**Fix:** Return primary health when primary is healthy, even if candidate is degraded.

---

### LG-41 MEDIUM — batchSendMessage silently returns empty array when inner does not support it

**Files:** `src/llm/core/base-decorator.ts:43-46`

**Logic Error:** When the inner adapter does not implement `batchSendMessage`, the decorator returns `Promise.resolve([])`. Callers interpret this as 'batch succeeded with zero results' rather than 'batch not supported'. Requests are dropped without error.

**Fix:** Throw an error instead of returning empty: `throw new Error('Inner adapter does not support batchSendMessage');`

---

### LG-42 MEDIUM — Round advancement counts duplicate arguments toward participant threshold

**Files:** `src/kernel/services/debate-service.ts:407-409`

**Logic Error:** Duplicate arguments (marked with `duplicateOf`) are still pushed to `session.arguments` and are counted toward the round advancement threshold. If 2 of 3 participants produce duplicates, `argsThisRound.length` reaches 3 and the round advances even though only 1 original argument was made.

**Fix:** Filter out duplicates: `const argsThisRound = session.arguments.filter(a => a.round === session.currentRound && !a.duplicateOf);`

---

### LG-43 MEDIUM — Governor not fed opening statements (round 0)

**Files:** `src/kernel/services/debate-service.ts:179-215,378`

**Logic Error:** `feedGovernor(arg)` is called only in `executeArgumentRound()`. Opening statements (round 0) are handled in `executeOpeningStatements()` which does **not** call `feedGovernor`. The governor's claim graph, novelty score, and convergence calculations all miss the opening claims.

**Fix:** Add `this.feedGovernor(arg)` inside the opening statements loop after pushing the argument.

---

### LG-44 MEDIUM — inferRelation requires BOTH texts to match contradiction pattern

**Files:** `src/kernel/services/debate-runtime/debate-memory-graph.ts:148`

**Logic Error:** `if (contradicts.test(aText) && contradicts.test(bText))` requires both texts to contain contradiction keywords. In typical debates, only one side uses contradiction language while the other states their position. Such pairs are never classified as `contradicts`.

**Fix:** Use OR instead of AND: `if (contradicts.test(aText) || contradicts.test(bText)) return 'contradicts';`

---

### LG-45 MEDIUM — Branch merge marks target merged but does not update target's arguments

**Files:** `src/kernel/services/debate-runtime/debate-branching.ts:74-79`

**Logic Error:** After `merge(sourceId, targetId)`: source gets combined arguments and `source.merged=true`. `target.merged=true` but `target.arguments` is unchanged. Any subsequent access to `target.arguments` returns stale data.

**Fix:** Also update target's arguments: `target.arguments = [...merged];` or do not mark target as merged.

---

### LG-46 MEDIUM — Agent loop does not check for paused phase mid-round

**Files:** `src/kernel/services/debate-runtime/debate-engine.ts:208`

**Logic Error:** `if (session.phase === 'cancelled' || session.phase === 'failed') break;` does **not** include `'paused'`. When `pauseSession()` transitions the session mid-round, the engine continues processing all remaining nodes. Users expect pause to stop as soon as possible.

**Fix:** Add `'paused'` to the break condition: `if (session.phase === 'cancelled' || session.phase === 'failed' || session.phase === 'paused') break;`

---

### LG-47 MEDIUM — Resume flow emits SESSION_STARTED instead of SESSION_RESUMED

**Files:** `src/kernel/services/debate-runtime/debate-engine.ts:191,545-557`

**Logic Error:** `resumeSession()` calls `startSession()` which unconditionally emits `SESSION_STARTED`. Consumers listening for `SESSION_RESUMED` get both events. Consumers listening for `SESSION_STARTED` get a duplicate for a session already started.

**Fix:** Add an `isResume` parameter to `startSession` and skip `SESSION_STARTED` emission when resuming.

---

### LG-48 MEDIUM — Convergence score biased low by cross-agent sequential comparison

**Files:** `src/kernel/services/debate-stop-conditions.ts:50-63`

**Logic Error:** `updateConvergenceScore` computes Jaccard similarity between chronologically consecutive arguments, which in a debate are often from opposing sides making counter-arguments. Counter-arguments naturally have low similarity, dragging down the convergence score. Sequential text similarity is a poor proxy for agreement.

**Fix:** Compare same-agent arguments across rounds, or compare each agent's position to others in the same round.

---

### LG-49 MEDIUM — HealingPlan summary counts always zero, never updated after execution

**Files:** `src/kernel/services/consistency-checker.ts:244-256`

**Logic Error:** In `analyze()`, `completedTasks` and `failedTasks` are computed from tasks that were just created with `status: 'pending'`, so both are always 0. After `executeAll()` changes task statuses, the plan-level counts remain stale.

**Fix:** Recompute counts when tasks change status, or use getters that compute lazily.

---

### LG-50 MEDIUM — DowngradeStrategy compares cost-per-request against cost-per-1k-tokens (unit mismatch)

**Files:** `src/kernel/services/downgrade-strategy.ts:56-59`

**Logic Error:** The threshold `costPer1kTokens` represents cost per 1,000 tokens. The metric `costPerRequest` is cost per request. The comparison `costPerRequest > costPer1kTokens` compares different units. These are only equal when every request uses exactly 1,000 tokens.

**Fix:** Use a dedicated `costPerRequestThreshold`, or normalize to the same unit before comparing.

---

### LG-51 MEDIUM — LifecycleManager tryInit() interprets retries as total attempts, not retry count

**Files:** `src/kernel/services/lifecycle-manager.ts:55-71`

**Logic Error:** The parameter `retries = 2` runs the loop from `attempt = 1` to `attempt <= retries`, yielding 2 total attempts. The conventional meaning of 'retries' is additional attempts after first failure (`retries = 2` should yield 3 total attempts).

**Fix:** Use `maxAttempts = 1 + retries;` and loop while `attempt <= maxAttempts`.

---

### LG-52 MEDIUM — SnapshotService.restore() does not restore disabled nodes state

**Files:** `src/kernel/services/snapshot-service.ts:116-153`

**Logic Error:** `capture()` creates `RuntimeState` with `disabledNodes:[]` and never populates from the orchestrator's `disabledNodes` set. `restore()` does not restore disabled nodes. After restoring a snapshot, previously disabled nodes become enabled.

**Fix:** In `capture()`, populate `disabledNodes` from `orchestrator.getDisabledNodes()`. In `restore()`, re-disable those nodes.

---

### LG-53 MEDIUM — SafetyContract weight normalization can produce negative weights

**Files:** `src/core/SafetyContract.ts:23-27`

**Logic Error:** When weights are normalized, the normalization factor preserves the sign. Since `effective = base + adaptiveDelta` (and delta can be negative up to `MAX_DRIFT = 0.15`), a negative weight multiplied by norm stays negative. This can lead to scoring inversions where worse providers are scored higher.

**Fix:** After normalization, clamp all weights to non-negative, then re-normalize if clamping changed the sum.

---

### LG-54 MEDIUM — SystemKernel.init() caches rejected promise, preventing retry

**Files:** `src/kernel/kernel.ts:53`

**Logic Error:** If `init()` fails, the rejected promise is stored in `this.initPromise`. Any subsequent call returns the same rejected promise, making it impossible to retry initialization without destroying and recreating the kernel.

**Fix:** On failure, clear `initPromise` so retry is possible: `try { await this.initPromise; } catch { this.initPromise = null; }`

---

### LG-55 MEDIUM — Similarity score incorrectly divided by component count

**Files:** `src/kernel/services/agent-similarity-service.ts:166-196`

**Logic Error:** `calculateSimilarity` returns `score / count`. When one component matches (weight 0.3), result is `0.3 / 1 = 0.3`. When two match `(0.3 + 0.3)`, result is `0.6 / 2 = 0.3`. Division by count makes it impossible to distinguish partial from more complete overlaps.

**Fix:** Return `score` directly (weights already sum to 1.0), or divide by total weight of considered components.

---

### LG-56 MEDIUM — Hardcoded 'role' string instead of actual role ID in cognitive service

**Files:** `src/kernel/services/cognitive-service.ts:362`

**Logic Error:** `recordRoleUsage('role', true, 0, tokens)` passes the literal string `'role'` as the role ID instead of the actual role ID from the node config. All usage is recorded under a single fake `'role'` key, making per-role statistics meaningless.

**Fix:** Use the actual role ID: `const roleId = node.config?.roleId || 'default';`

---

### LG-57 MEDIUM — byRequestId index becomes inconsistent after eviction

**Files:** `src/kernel/services/message-index-service.ts:128-131`

**Logic Error:** When the oldest message is evicted, `byRequestId.delete(removed.requestId)` deletes the entry even though a newer message with the same `requestId` still exists in the `messages` array. After eviction, the remaining message becomes unindexable via `byRequestId`.

**Fix:** Only delete the map entry if the evicted message is the same object currently stored: `if (this.byRequestId.get(removed.requestId) === removed) delete;`

---

### LG-58 MEDIUM — prune() dryRun omits importanceBelow details

**Files:** `src/kernel/services/memory-engine.ts:388-396`

**Logic Error:** In `prune()`, the `olderThan` branch pushes to `details` unconditionally (even during dryRun), but the `importanceBelow` branch only pushes when `!dryRun`. A dryRun with `importanceBelow` specified reports 0 items for that criterion.

**Fix:** Push details for `importanceBelow` regardless of `dryRun`. Only skip the actual deletion during dryRun.

---

### LG-59 MEDIUM — False-positive 429 detection from substring match

**Files:** `src/kernel/services/chat-service.ts:380`

**Logic Error:** `errMsg.includes('429')` matches any string containing `'429'`, including unrelated text like `'request #1429'` or `'error code 4290'`. This can cause false-positive rate-limit detection, triggering unnecessary failover.

**Fix:** Use word-boundary matching: `/\b429\b/.test(errMsg)`, or check `error.statusCode === 429` directly.

---

### LG-60 MEDIUM — STREAM_END handler does not update latency/token averages

**Files:** `src/kernel/services/agent-service.ts:139-152`

**Logic Error:** The `COGNITIVE_STEP_COMPLETED` listener correctly computes running averages for latency and `avgTokensPerCall`. However, the `STREAM_END` listener directly mutates `cur.calls/tokens/cost` without updating `cur.latency` or `cur.avgTokensPerCall`. These fields become stale when `STREAM_END` events are the primary source.

**Fix:** Update averages in the `STREAM_END` handler using the same running-average formula.

---

### LG-61 MEDIUM — computeId collisions when metadata is undefined

**Files:** `src/kernel/services/memory-engine.ts:229`

**Logic Error:** `computeId(entry.content, entry.metadata.source, entry.metadata.type)` passes `metadata.source` and `.type` which may be `undefined`. The function concatenates them into the hash input, converting `undefined` to `"undefined"`. All entries with undefined source/type hash to the same prefix, causing upsert to overwrite unrelated entries.

**Fix:** Guard against undefined: `const source = entry.metadata.source ?? 'unknown'; const type = entry.metadata.type ?? 'generic';`

---

### LG-62 MEDIUM — Legacy stop conditions unreachable (governor always instantiated)

**Files:** `src/kernel/services/debate-service.ts:135,389-404`

**Logic Error:** `startDebate()` always creates `this.governor = new DebateGovernor()`. The fallback check `if (!this.governor)` is always false, making the entire legacy stop-conditions block unreachable dead code. If the governor's heuristics fail, the legacy backup can never kick in.

**Fix:** Make governor instantiation conditional (e.g., `config.useGovernor !== false`), or remove the dead legacy code.

---

### LG-63 MEDIUM — classifyNodeType dead branch for round===0

**Files:** `src/kernel/services/debate-runtime/debate-compiler.ts:93-94`

**Logic Error:** `if (arg.round === 0) return 'argument'; return 'argument';` Both branches return `'argument'`, making the `round === 0` check meaningless. If round-0 arguments were intended to be classified differently (e.g., as `'opening'`), the logic is broken.

**Fix:** Either remove the dead branch or classify round-0 arguments distinctly if the type union supports it.

---

### LG-64 LOW — Budget-penalized keys added to skipped list but not actually excluded

**Files:** `src/kernel/services/provider-router.ts:540-543`

**Logic Error:** When `budgetPenalty > 0`, the key is pushed into `skipped` with `stage:'budget'`, but the key remains in the ranked list (just with a score penalty). The `skipped` list semantically implies exclusion, and downstream steps log marks it as blocked, but the key is not actually blocked.

**Fix:** Either actually exclude the key (return `null` from the map callback) or do not add budget-penalized keys to `skipped`.

---

### LG-65 LOW — Bidirectional prefix matching returns wrong pricing for novel model variants

**Files:** `src/kernel/services/pricing-service.ts:156-158`

**Logic Error:** `key.startsWith(k) || k.startsWith(key)` is bidirectional. For a query like `'gpt-4'` with no exact match, `'gpt-4o'.startsWith('gpt-4')` would match, returning cheaper gpt-4o pricing instead of gpt-4 pricing.

**Fix:** Change to unidirectional prefix matching: `key.startsWith(k)` only.

---

### LG-66 LOW — Circuit breaker dead-code no-op inFlightHalfOpen reset

**Files:** `src/llm/decorators/circuit-breaker.ts:77-79`

**Logic Error:** `if (this.inFlightHalfOpen === 0) { this.inFlightHalfOpen = 0; }` is a no-op (0 = 0). The comment says "Only reset if no concurrent requests are in-flight," but both branches produce the same result.

**Fix:** Remove the dead conditional, or if the intent was to reset on transition, implement the actual reset logic.

---

### LG-67 LOW — DebateRoom.start() sets room state to active after session completes

**Files:** `src/kernel/services/debate-runtime/debate-room.ts:64-84`

**Logic Error:** `engine.startSession()` blocks until the entire debate completes. After it returns, line 77 calls `updateRoomState(sessionId, 'active')`, but the session is already `completed`. The room state becomes `'active'` while the session is `'completed'`.

**Fix:** After `startSession` returns, sync room state from the engine's session snapshot.

---

### LG-68 LOW — detectChallenges skips same-round claims, missing immediate rebuttals

**Files:** `src/kernel/services/debate-governor/claim-graph.ts:33`

**Logic Error:** `if (a.round === b.round) continue;` skips all claim pairs from the same round. In roundtable debates, agents in the same round may directly challenge each other's claims, but these are never detected as edges.

**Fix:** Allow same-round challenges when agents differ: `if (a.round === b.round && a.speaker === b.speaker) continue;`

---

### LG-69 LOW — Asymmetric overlap denominator inflates contradiction detection

**Files:** `src/kernel/services/debate-governor/contradiction-detector.ts:48-50`

**Logic Error:** Using `Math.min(aWords.length, bWords.length)` as denominator means a short claim sharing a few words with a long claim gets artificially high overlap. A 5-word claim sharing 3 words with a 50-word claim gives overlap = 0.6 even though the long claim is mostly unrelated.

**Fix:** Use Jaccard similarity (intersection/union) instead of asymmetric overlap.

---

### LG-70 LOW — RewindService.undo() returns partial messages, not full pre-rewind state

**Files:** `src/kernel/services/rewind-service.ts:148-181`

**Logic Error:** `undo()` returns `{ messages: undoWindow.messages }` which contains only the removed messages. The caller receives partial data and must manually combine with the current truncated messages to restore the full pre-rewind state. The return type `'messages'` suggests a complete list.

**Fix:** Return the full restored state or rename the field to `removedMessages`.

---

### LG-71 LOW — completedNodes increments for both success and error

**Files:** `src/kernel/services/orchestration-service.ts:199,207`

**Logic Error:** When a node execution fails, `failedNodes++` is incremented, but `completedNodes++` is also reached on line 207. The name `completedNodes` implies successful completion, but it counts all processed nodes regardless of outcome.

**Fix:** Only increment `completedNodes` when `status === 'done'`, not on error.

---

### LG-72 LOW — Agent delegation MAX_TASKS only limits completed/failed tasks

**Files:** `src/kernel/services/agent-delegation-service.ts:140-147`

**Logic Error:** The cleanup method enforces `MAX_TASKS` by removing only completed/failed tasks. Running and pending tasks are never cleaned up, so if many delegations stay in running/pending state, the `tasks` map can grow unbounded.

**Fix:** Include stale running tasks in the cleanup: evict running tasks older than a threshold if still over limit.

---

### LG-73 LOW — storeBatch creates DB/in-memory inconsistency

**Files:** `src/kernel/services/memory-engine.ts:258-275`

**Logic Error:** `storeBatch` writes each entry to the database, then prepends all new entries to the in-memory array and slices to `MAX_MEMORY_ENTRIES`. If `newEntries.length > MAX_MEMORY_ENTRIES`, all old entries are evicted from memory but remain in the database. Subsequent reads via `search()` may find them but `getMemories()` will not.

**Fix:** Also evict excess entries from the database to maintain consistency with the in-memory limit.