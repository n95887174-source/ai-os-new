```markdown
# Memory & Resource Leak Audit Report

**Repository:** n95887174-source/ai-os-new  
**Date:** 2026-06-12  
**Scope:** src/ directory (772 source files, 40+ examined in depth)

## Executive Summary

This audit identified 39 confirmed memory and resource leaks across the ai-os-new codebase. The findings span six categories: missing useEffect cleanup, SSE/stream connection leaks, unbounded data structure growth, audio node and SpeechRecognition leaks, timer/request lifecycle issues, and async operations that outlive their owning component or service. Of these, **3 are Critical** (will cause ongoing resource consumption in normal usage), **7 are High** (likely to cause issues under moderate load or during component lifecycle transitions), **17 are Medium** (accumulative impact over time), and **12 are Low** (best-practice violations with minimal practical impact).

| Severity | Count | Key Patterns |
|----------|-------|---------------|
| CRITICAL | 3 | Zombie timers, unclosed HTTP connections, active requests not aborted on destroy |
| HIGH | 7 | Recursive retries, untracked timeouts, SpeechRecognition leaks, event listener leaks |
| MEDIUM | 17 | Unbounded caches/maps, async lifecycle, audio node leaks, stream cleanup gaps |
| LOW | 12 | Object URL best practices, edge-case closures, small timer windows |

| Leak Category | Findings |
|---------------|----------|
| Unbounded Growth | 8 |
| Async Lifecycle | 7 |
| Timer Leak | 5 |
| useEffect Cleanup | 4 |
| SSE / Stream | 3 |
| Service Lifecycle | 3 |
| Audio Node | 3 |
| SpeechRecognition | 2 |
| Event Listener | 2 |
| Object URL | 1 |
| Stale Closure | 1 |

## Detailed Findings

### CRITICAL SEVERITY (3 findings)

#### L-01 | Recursive setTimeout with no cleanup return
**File:** `src/components/DebatePanel/DebateWorkspacePanel.tsx` | **Lines:** 41-70 | **Category:** useEffect Cleanup

**Why it leaks:** The useEffect has no return cleanup function. A `check()` function recursively schedules itself via `setTimeout`. When the component unmounts, zombie timers continue to fire, calling `setRooms()`, `setReady()`, and `loadRooms()` on an unmounted component.

**Runtime impact:** Zombie timers fire up to 20 times (10s) after unmount. Each call attempts `setState` on an unmounted component, causing React warnings and potential state corruption on remount.

**Fix:** Track the timeout ID and clear it in the cleanup return:
```ts
let timeoutId;
...
timeoutId = setTimeout(check, 500);
...
return () => clearTimeout(timeoutId);
```

#### L-02 | Response body reader never cancelled on generator drop
**File:** `src/llm/streaming/resumable-stream.ts` | **Lines:** 128-146, 311-318 | **Category:** SSE / Stream

**Why it leaks:** `response.body.getReader()` is acquired but never cancelled if the consumer abandons the async generator without fully consuming it. There is no `finally` block that calls `reader.cancel()`. The fetch() connection stays alive indefinitely.

**Runtime impact:** Every interrupted or partially-consumed resumable stream leaves an open HTTP connection. Under sustained use with network interruptions, this can exhaust browser connection limits (6 per origin) or cause memory pressure from buffered response data.

**Fix:** Add try/finally around the async generator body. In finally, call `reader?.cancel("generator dropped")` and clearTimeout(timeoutId).

#### L-03 | ChatService.destroy() does not abort active requests
**File:** `src/kernel/services/chat-service.ts` | **Lines:** 83-86, 71, 240-241 | **Category:** Service Lifecycle

**Why it leaks:** The `activeRequests` Map holds AbortController instances for in-flight requests, but `destroy()` only unsubscribes event listeners. It never aborts the active requests. On HMR or service restart, stale streaming connections persist.

**Runtime impact:** On HMR or service restart, stale streaming connections persist consuming bandwidth and connection slots. Their callbacks may throw or cause ghost state updates.

**Fix:** In `destroy()`, iterate `activeRequests.values()` and call `controller.abort()`, then clear the map.

---

### HIGH SEVERITY (7 findings)

#### L-04 | Untracked recursive setTimeout in retry loop
**File:** `src/components/SREAgentPanel/SREAgentPanel.tsx` | **Lines:** 42-58 | **Category:** useEffect Cleanup

**Why it leaks:** `tryRefresh()` uses `setTimeout(tryRefresh, 500)` to retry when the service is not ready. This timeout is not tracked in a ref, so the cleanup on lines 79-84 cannot cancel it. If the component unmounts while `tryRefresh` is retrying, the orphaned timeout fires on an unmounted component.

**Runtime impact:** Zombie timeout fires on unmounted component causing React warnings. If advisorService is slow to initialize, repeated `setState` calls occur over multiple seconds after unmount.

**Fix:** Add a `let retryTimeoutId` variable inside the effect. Track it in `tryRefresh`. Clear it in the cleanup return along with existing `unsubs` and `clearInterval`.

#### L-05 | cleanup() does not abort active streams before deleting state
**File:** `src/llm/streaming/resumable-stream.ts` | **Lines:** 460-468 | **Category:** SSE / Stream

**Why it leaks:** The `cleanup()` method deletes stream state from the Map when streams exceed maxAgeMs, but never calls `abort()` on the stream's AbortController before deleting. If a stream is still active, the HTTP connection persists.

**Runtime impact:** Long-running streams keep HTTP connections open even after ResumableStream considers them garbage. Connection and memory leak.

**Fix:** Before `this.streams.delete(streamId)`, check `state.abortController` and `state.status === "active"`, and call `state.abortController.abort()`.

#### L-06 | DebateLLMCaller.callLLM has no external abort linkage
**File:** `src/kernel/services/debate-llm-caller.ts` | **Lines:** 151-162 | **Category:** Service Lifecycle

**Why it leaks:** Each call creates an AbortController with a timeout, but if the debate is stopped externally, there is no mechanism to abort the in-progress LLM call. The controller is purely timeout-based.

**Runtime impact:** Stale LLM requests continue consuming API quota and network resources for up to `timeoutMs` after the debate is cancelled.

**Fix:** Accept an optional `AbortSignal` from the debate session and chain it: `externalSignal.addEventListener("abort", () => controller.abort(), { once: true })`.

#### L-07 | DebateEngine.callLLM has no external abort linkage
**File:** `src/kernel/services/debate-runtime/debate-engine.ts` | **Lines:** 330-332 | **Category:** Service Lifecycle

**Why it leaks:** Identical to L-06 but in DebateEngine. Each retry loop creates an AbortController with a timeout, but no way to cancel the in-progress call from outside.

**Runtime impact:** Same as L-06: wasted API quota and network resources after debate stop.

**Fix:** Pass an `AbortSignal` through from the debate session lifecycle into `callLLM` and chain it to the per-attempt controller.

#### L-08 | SpeechRecognition never stopped on unmount
**File:** `src/components/ChatPanel/VoiceButton.tsx` | **Lines:** 14-50 | **Category:** SpeechRecognition

**Why it leaks:** SpeechRecognition instance is created and started but never stopped when the component unmounts. The component has no `useEffect` cleanup at all. The browser mic indicator stays active. `onend`/`onerror` callbacks reference stale closure state.

**Runtime impact:** Microphone stays on after navigating away. Potential console errors from state updates on unmounted components. Users see the browser mic indicator persisting.

**Fix:** Add `useEffect(() => () => { recognitionRef.current?.abort(); recognitionRef.current = null; }, [])`.

#### L-09 | BrowserSTTService singleton has no destroy method; restart loop never cleared
**File:** `src/kernel/services/browser-stt.ts` | **Lines:** 68-183, 267-279, 363 | **Category:** SpeechRecognition

**Why it leaks:** The singleton creates a SpeechRecognition instance. The `restart()` method uses `setTimeout` that is never tracked or cleared. The `onend` handler creates an infinite restart loop when `state === "listening"`. No `destroy()` method exists.

**Runtime impact:** If `start()` is called, recognition can restart indefinitely. The `abort()` method does not clear pending restart timeouts. No destroy path means the microphone can stay active for the entire app lifecycle.

**Fix:** Add a `destroy()` method. Track `restartTimer` with `clearTimeout` in `destroy()`. Call `this.recognition?.abort()` and set `this.recognition = null`. Clear all listeners.

#### L-10 | window message listener never removed on unmount
**File:** `src/components/ChatPanel/CodeRunner.tsx` | **Lines:** 85-94, 126-160 | **Category:** Event Listener

**Why it leaks:** The `cleanup()` function removes the iframe and clears `timeoutRef`, but does **not** call `window.removeEventListener("message", listener)`. If the iframe posts a message after unmount, the listener fires on a dead component.

**Runtime impact:** State updates on unmounted component; listener keeps component closure alive preventing GC.

**Fix:** Store the listener reference. In the cleanup callback, also call `window.removeEventListener("message", listenerRef.current)`.

---

### MEDIUM SEVERITY (17 findings)

#### L-11 | setTimeout inside event handler not cleared on unmount
**File:** `src/components/DebatePanel/DebatePanel.tsx` | **Lines:** 153-157 | **Category:** useEffect Cleanup

**Why it leaks:** Inside the `debate:updated` event handler, there is a `setTimeout` for auto-scrolling (100ms). The cleanup only unsubscribes from the event and clears the loading timer. It does not clear timeouts spawned from inside the event handler.

**Fix:** Track the `scrollTimeout` in a variable and clear it in the cleanup return.

#### L-12 | Dynamic style element injected but never removed
**File:** `src/components/HealthPanel/HealthPanel.tsx` | **Lines:** 77-96 | **Category:** useEffect Cleanup

**Why it leaks:** The `useEffect` creates a style element with `@keyframes` and appends it to `document.head`. The cleanup unsubscribes from `eventBus` and clears timeouts, but does **not** remove the style element. Guarded by ID check so only created once, but persists after unmount.

**Fix:** Store the style element reference. In the cleanup return, call `styleEl.remove()` if it was created by this instance.

#### L-13 | Intermediate ReadableStream not cancelled on error path
**File:** `src/llm/http/sse-parser.ts` | **Lines:** 29-162 | **Category:** SSE / Stream

**Why it leaks:** If `onChunk` throws, the `catch` block cancels `bodyReader` but the intermediate ReadableStream is never closed/cancelled via its own `cancel()` method. The reader lock is released in `finally` but the stream remains in a limbo state.

**Fix:** Add `reader.cancel().catch(() => {})` in the catch block before `bodyReader.cancel()`.

#### L-14 | 30+ sequential fetches with no abort on unmount
**File:** `src/components/DocsHealthPanel.tsx` | **Lines:** 44-78 | **Category:** Async Lifecycle

**Why it leaks:** `fetchDocs()` iterates over 30+ doc files, fetching each sequentially with `fetch()`. No `AbortController` is used. `isMountedRef` prevents state updates but HTTP connections persist.

**Fix:** Add an `AbortController` and pass its signal to each `fetch()`. Abort in the `useEffect` cleanup.

#### L-15 | syncFromOpenRouter fetch with no timeout/signal
**File:** `src/kernel/services/pricing-service.ts` | **Lines:** 297 | **Category:** Async Lifecycle

**Why it leaks:** The method calls `fetch("https://openrouter.ai/api/v1/models")` with no abort signal and no timeout. The promise is cached, so a second call awaits the same hung promise. No `destroy()` method to cancel.

**Fix:** Use `AbortSignal.timeout(15000)` or create an AbortController with timeout. Add a `destroy()` method that aborts.

#### L-16 | probe() fetch with no timeout/signal
**File:** `src/kernel/services/provider-catalog-service.ts` | **Lines:** 221-224 | **Category:** Async Lifecycle

**Why it leaks:** The `probe()` method fetches provider endpoints with no abort signal. If the provider endpoint is unresponsive, this fetch hangs forever with no timeout.

**Fix:** Add `signal: AbortSignal.timeout(10000)` to the fetch options.

#### L-17 | ConfigHistoryService.history unbounded array
**File:** `src/kernel/services/config-history.ts` | **Lines:** 28, 48 | **Category:** Unbounded Growth

**Why it leaks:** `commit()` pushes a deep-cloned ConfigRegistry snapshot (large object) on every config change. No size limit, no eviction, no clear. Each entry contains a full `JSON.parse(JSON.stringify(config))` snapshot.

**Fix:** Add `MAX_HISTORY = 50` and evict oldest: `if (this.history.length > MAX_HISTORY) this.history.shift()`.

#### L-18 | MetricsService alerts/recentLatencies/throughput unbounded
**File:** `src/kernel/services/metrics-service.ts` | **Lines:** 33, 37-38, 149, 242-258 | **Category:** Unbounded Growth

**Why it leaks:** `alerts` array accumulates resolved alerts forever (only `resetHistory()` clears). `recentLatencies` and `throughput` Maps create a new entry per unique `agentId` but never remove stale keys. Per-value arrays are capped at 100 but the Map itself has no size limit.

**Fix:** Add `MAX_ALERTS = 200` and prune resolved alerts. Add `MAX_AGENTS = 50` and evict least-recently-used Map entries.

#### L-19 | TraceService.activeTraces leak for interrupted requests
**File:** `src/kernel/services/trace-service.ts` | **Lines:** 22, 81, 139, 179 | **Category:** Unbounded Growth

**Why it leaks:** `REQUEST_INCOMING` adds traces. `REQUEST_COMPLETED` and `STREAM_END` remove them. If a request starts but never completes (network error, tab closed), the trace stays in `activeTraces` forever. No timeout-based cleanup.

**Fix:** Add a periodic cleanup that removes active traces older than 10 minutes.

#### L-20 | ResumableStream streams/chunkBuffer stale data and unbounded per-stream chunks
**File:** `src/llm/streaming/resumable-stream.ts` | **Lines:** 52-53, 71-72, 183-184 | **Category:** Unbounded Growth

**Why it leaks:** `cleanup()` is only called inside `create()`, not on a timer. If no new streams are created, completed/failed streams persist indefinitely. `chunkBuffer` has no `maxBufferSize` cap; only the local `chunks` variable is capped.

**Fix:** Add a `setInterval` that calls `cleanup()` periodically (e.g., every 5 minutes). Apply `maxBufferSize` cap to `chunkBuffer` entries.

#### L-21 | Audio nodes connected but never disconnected
**File:** `src/components/AquariumPanel/AudioManager.ts` | **Lines:** 40-80, 104-108 | **Category:** Audio Node

**Why it leaks:** `gainNode`, `osc2`, `lfo`, `lfoGain` are connected to the audio graph but never `.disconnect()`-ed. `stopAmbient()` calls `.stop()` on oscillators but does not disconnect any node. `destroy()` calls `ctx?.close()` without first disconnecting nodes.

**Fix:** In `stopAmbient()`, call `.disconnect()` on all nodes: `ambientSource`, `osc2`, `lfo`, `lfoGain`, `gainNode`. In `destroy()`, disconnect before closing context.

#### L-22 | BiquadFilter reference lost; gain nodes never disconnected in destroy()
**File:** `src/components/AquariumPanel/audio/audio-manager.ts` | **Lines:** 130-155, 398-408 | **Category:** Audio Node

**Why it leaks:** The BiquadFilter created in `startAmbient()` is a local variable; its reference is lost immediately after `startAmbient()` returns. `masterGain`, `ambientGain`, `eventGain` are never disconnected in `destroy()` before `audioContext?.close()`.

**Fix:** Store `ambientFilter` as a class property. Disconnect it in `stopAmbient()`. In `destroy()`, call `.disconnect()` on `masterGain`, `ambientGain`, `eventGain` before closing context.

#### L-23 | Worker request timeouts not cleared on success
**File:** `src/kernel/services/memory-engine.ts` | **Lines:** 155-168 | **Category:** Timer Leak

**Why it leaks:** `sendToWorker()` creates a 30-second `setTimeout`. When the worker responds successfully via `handleWorkerMessage`, the pending request is deleted from the map but the timeout is **not** cleared. It fires later, attempting to reject an already-resolved promise.

**Fix:** Track the timeout in the `PendingRequest` object. In `handleWorkerMessage`, call `clearTimeout(pending.timer)` before deleting from the map.

#### L-24 | probeAll() async without mounted guard
**File:** `src/components/HealthPanel/HealthPanel.tsx` | **Lines:** 214-225 | **Category:** Async Lifecycle

**Why it leaks:** `await probeService.probeAll()` is called from an inline `onClick` async handler. After the await, `setProbeResults(map)` and `setProbeLoading(false)` are called without checking if the component is still mounted.

**Fix:** Add `isMountedRef` guard: `if (!isMountedRef.current) return;` before all post-await `setState` calls.

#### L-25 | probeAll() async without mounted guard
**File:** `src/components/ProviderManager/InstalledProvidersView.tsx` | **Lines:** 966-976 | **Category:** Async Lifecycle

**Why it leaks:** Same pattern as L-24. `await probeService.probeAll()` from inline `onClick`, then `setBatchProbeResults(map)`/`setBatchProbeLoading(false)` without mounted guard.

**Fix:** Add `isMountedRef` and guard all post-await state updates.

#### L-26 | handleCreate/handleStart async without mounted guards
**File:** `src/components/DebateRuntimePanel/DebateRuntimePanel.tsx` | **Lines:** 320-378 | **Category:** Async Lifecycle

**Why it leaks:** `handleCreate` is async and calls `debateEngine.createSession()`. After the async work, `setTopic("")`, `setCreating(false)`, `setSelectedId(id)` are called without checking if the component is still mounted. Similarly `handleStart`.

**Fix:** Add `isMountedRef` (not currently present in this component) and guard all post-await state updates.

#### L-27 | saveTimerRef not cleared on unmount
**File:** `src/components/EventsTimeline/EventsTimeline.tsx` | **Lines:** 70, 73-108 | **Category:** Async Lifecycle

**Why it leaks:** `saveTimerRef` is used for debounced saves, but the `useEffect` return only unsubscribes from `eventBus`. The `saveTimerRef.current` timeout is not cleared on unmount.

**Fix:** Add `if (saveTimerRef.current) clearTimeout(saveTimerRef.current);` to the cleanup return.

---

### LOW SEVERITY (12 findings)

#### L-28 | URL.createObjectURL in download handlers not revoked
**Files:** `MessageSearchPanel.tsx`, `DecisionLogPanel.tsx`, `BookmarksPanel.tsx` and 2 similar | **Category:** Object URL

**Why it leaks:** These components create blob URLs for file downloads but never call `URL.revokeObjectURL()`. Each blob URL holds a reference to the blob in memory until the page is unloaded.

**Fix:** After `a.click()`, call `setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100)`.

#### L-29 | Storage event listener never removed in destroy()
**File:** `src/kernel/services/cross-tab-state.ts` | **Lines:** 86-96, 317-322 | **Category:** Event Listener

**Why it leaks:** `initLocalStorageCallback()` adds a window `"storage"` listener with an anonymous function. `destroy()` closes BroadcastChannel but does not remove the storage listener. The anonymous function cannot be removed.

**Fix:** Store the handler reference as a class property. Call `window.removeEventListener("storage", this.storageHandler)` in `destroy()`.

#### L-30 | knownTabTimestamps Map never cleaned
**File:** `src/kernel/services/cross-tab-state.ts` | **Lines:** 56, 103 | **Category:** Unbounded Growth

**Why it leaks:** Every message from a remote tab adds/updates an entry. Tab IDs are never removed, even after tabs close. No cleanup, no size limit.

**Fix:** Add periodic cleanup of entries older than 5 minutes, or cap at `MAX_TABS = 20`.

#### L-31 | CacheDecorator semanticIndex empty buckets never removed; modelCache no size limit
**File:** `src/llm/decorators/cache-decorator.ts` | **Lines:** 7, 142-143, 155, 163 | **Category:** Unbounded Growth

**Why it leaks:** `semanticIndex` outer Map creates buckets per `apiKeyHash:model`. When LRU eviction removes entries, empty bucket Maps are never deleted from the outer Map. `modelCache` has TTL of 120s but no size limit; expired entries for keys never queried again stay forever.

**Fix:** After deleting from a bucket, check `bucket.size === 0` and delete the bucket from `semanticIndex`. Add periodic TTL cleanup for `modelCache` or cap at `MAX_MODEL_CACHE = 50`.

#### L-32 | Object pool grows without bound
**File:** `src/components/AquariumPanel/hooks/useObjectPool.ts` | **Lines:** 26-28 | **Category:** Unbounded Growth

**Why it leaks:** `acquire()` pushes a new item if none available. If `release()` is never called (component unmounts without cleanup) or if `acquire` outpaces `release`, the pool grows indefinitely. `clear()` exists but must be called explicitly.

**Fix:** Add size limit or auto-cleanup on unmount.

#### L-33 | Unguarded setTimeout in saveEditing (5s)
**File:** `src/components/ChatPanel/ChatPanel.tsx` | **Lines:** 546 | **Category:** Timer Leak

**Why it leaks:** `setTimeout(() => setUndoText(null), 5000)` with no mounted guard or ref tracking. The 5-second timer can fire after the component unmounts.

**Fix:** Store timeout ref and clear in unmount cleanup, or guard with `isMountedRef.current`.

#### L-34 | Unguarded setTimeout in handleResetAllStats (5s)
**File:** `src/components/AgentsPanel/AgentsPanelContainer.tsx` | **Lines:** 225 | **Category:** Timer Leak

**Why it leaks:** `setTimeout(() => setResetAllArmed(false), 5000)` with no mounted guard and no `isMountedRef` in the component.

**Fix:** Add `isMountedRef` to the container and guard: `if (isMountedRef.current) setResetAllArmed(false)`.

#### L-35 | Unguarded setTimeout in handleSave (2s)
**File:** `src/components/EventsTimeline/EventsTimeline.tsx` | **Lines:** 150 | **Category:** Timer Leak

**Why it leaks:** `setTimeout(() => setSaved(false), 2000)` with no mounted guard.

**Fix:** Use `isMountedRef` or store timeout ref and clear on unmount.

#### L-36 | Unguarded setTimeout in ripple cleanup (1s)
**File:** `src/components/AquariumPanel/hooks/useAquariumScene.ts` | **Lines:** 48, 67 | **Category:** Timer Leak

**Why it leaks:** `setTimeout(() => setRipples(prev => prev.filter(...)), 1000)` in `handleContainerClick` and `feedAllFishes` with no mounted guard.

**Fix:** Pass `isMountedRef` from the parent panel into this hook, or maintain an internal `isMountedRef`.

#### L-37 | SpeechRecognition onresult captures stale onTranscript closure
**File:** `src/components/ChatPanel/VoiceButton.tsx` | **Lines:** 35-42 | **Category:** Stale Closure

**Why it leaks:** `recognition.onresult` captures `onTranscript` from the closure at the time `startListening` was called. If the parent re-renders with a new `onTranscript` reference, the old recognition instance still calls the stale callback.

**Fix:** Use a ref for `onTranscript`: `const onTranscriptRef = useRef(onTranscript); onTranscriptRef.current = onTranscript;` Then call `onTranscriptRef.current(...)` in `onresult`.

#### L-38 | Singleton AudioContext created eagerly at module load, never destroyed
**File:** `src/components/AquariumPanel/audio/audio-manager.ts` | **Lines:** 42-44, 412 | **Category:** Audio Node

**Why it leaks:** The singleton `aquariumAudioManager` is instantiated at module load. The constructor calls `init()` which creates an AudioContext immediately. `destroy()` exists but is never called by any consumer.

**Fix:** Lazy-initialize the AudioContext on first use. Ensure the component that uses it calls `destroy()` on unmount.

#### L-39 | EventBus.deferCounts edge case orphaned entries
**File:** `src/kernel/events/event-bus.ts` | **Lines:** 271 | **Category:** Unbounded Growth

**Why it leaks:** Entries are normally cleaned up in `setTimeout` callback. But if `emit()` is called during teardown, deferred emits could orphan entries in `deferCounts`. `reset()` does not clear `deferCounts`.

**Fix:** Add `deferCounts.clear()` to the `reset()` method.

---

## Priority Fix Order

| # | Severity | ID | File | Title |
|---|----------|----|------|-------|
| 1 | CRITICAL | L-01 | DebateWorkspacePanel.tsx | Recursive setTimeout with no cleanup return |
| 2 | CRITICAL | L-02 | resumable-stream.ts | Response body reader never cancelled on generator drop |
| 3 | CRITICAL | L-03 | chat-service.ts | ChatService.destroy() does not abort active requests |
| 4 | HIGH | L-04 | SREAgentPanel.tsx | Untracked recursive setTimeout in retry loop |
| 5 | HIGH | L-05 | resumable-stream.ts | cleanup() does not abort active streams before deleting state |
| 6 | HIGH | L-06 | debate-llm-caller.ts | DebateLLMCaller.callLLM has no external abort linkage |
| 7 | HIGH | L-07 | debate-engine.ts | DebateEngine.callLLM has no external abort linkage |
| 8 | HIGH | L-08 | VoiceButton.tsx | SpeechRecognition never stopped on unmount |
| 9 | HIGH | L-09 | browser-stt.ts | BrowserSTTService singleton has no destroy method; restart loop never cleared |
| 10 | HIGH | L-10 | CodeRunner.tsx | window message listener never removed on unmount |
| 11 | MEDIUM | L-11 | DebatePanel.tsx | setTimeout inside event handler not cleared on unmount |
| 12 | MEDIUM | L-12 | HealthPanel.tsx | Dynamic style element injected but never removed |
| 13 | MEDIUM | L-13 | sse-parser.ts | Intermediate ReadableStream not cancelled on error path |
| 14 | MEDIUM | L-14 | DocsHealthPanel.tsx | 30+ sequential fetches with no abort on unmount |
| 15 | MEDIUM | L-15 | pricing-service.ts | syncFromOpenRouter fetch with no timeout/signal |
| 16 | MEDIUM | L-16 | provider-catalog-service.ts | probe() fetch with no timeout/signal |
| 17 | MEDIUM | L-17 | config-history.ts | ConfigHistoryService.history unbounded array |
| 18 | MEDIUM | L-18 | metrics-service.ts | MetricsService alerts/recentLatencies/throughput unbounded |
| 19 | MEDIUM | L-19 | trace-service.ts | TraceService.activeTraces leak for interrupted requests |
| 20 | MEDIUM | L-20 | resumable-stream.ts | ResumableStream streams/chunkBuffer stale data and unbounded per-stream chunks |
| 21 | MEDIUM | L-21 | AudioManager.ts | Audio nodes connected but never disconnected |
| 22 | MEDIUM | L-22 | audio-manager.ts | BiquadFilter reference lost; gain nodes never disconnected in destroy() |
| 23 | MEDIUM | L-23 | memory-engine.ts | Worker request timeouts not cleared on success |
| 24 | MEDIUM | L-24 | HealthPanel.tsx | probeAll() async without mounted guard |
| 25 | MEDIUM | L-25 | InstalledProvidersView.tsx | probeAll() async without mounted guard |
| 26 | MEDIUM | L-26 | DebateRuntimePanel.tsx | handleCreate/handleStart async without mounted guards |
| 27 | MEDIUM | L-27 | EventsTimeline.tsx | saveTimerRef not cleared on unmount |
| 28 | LOW | L-28 | Multiple | URL.createObjectURL in download handlers not revoked |
| 29 | LOW | L-29 | cross-tab-state.ts | Storage event listener never removed in destroy() |
| 30 | LOW | L-30 | cross-tab-state.ts | knownTabTimestamps Map never cleaned |
| 31 | LOW | L-31 | cache-decorator.ts | CacheDecorator semanticIndex empty buckets never removed; modelCache no size limit |
| 32 | LOW | L-32 | useObjectPool.ts | Object pool grows without bound |
| 33 | LOW | L-33 | ChatPanel.tsx | Unguarded setTimeout in saveEditing (5s) |
| 34 | LOW | L-34 | AgentsPanelContainer.tsx | Unguarded setTimeout in handleResetAllStats (5s) |
| 35 | LOW | L-35 | EventsTimeline.tsx | Unguarded setTimeout in handleSave (2s) |
| 36 | LOW | L-36 | useAquariumScene.ts | Unguarded setTimeout in ripple cleanup (1s) |
| 37 | LOW | L-37 | VoiceButton.tsx | SpeechRecognition onresult captures stale onTranscript closure |
| 38 | LOW | L-38 | audio-manager.ts | Singleton AudioContext created eagerly at module load, never destroyed |
| 39 | LOW | L-39 | event-bus.ts | EventBus.deferCounts edge case orphaned entries |

---

## Areas Audited With No Leaks Found

The following high-risk areas were thoroughly reviewed and found to have proper resource management.

| File | Patterns | Status |
|------|----------|--------|
| src/hooks/useBookmarkShortcut.ts | addEventListener, eventBus.on | Both cleaned up |
| src/hooks/useKeyboardShortcut.ts | addEventListener | Cleaned up |
| src/hooks/useAutoClearError.ts | setTimeout | Cleaned up via ref |
| src/hooks/useMediaQuery.ts | addEventListener | Cleaned up |
| src/components/ModalShell.tsx | addEventListener | Cleaned up |
| src/components/AlertLayer/AlertLayer.tsx | eventBus.onSafe (x7), setInterval | All cleaned up |
| src/components/StateInspectorPanel.tsx | setInterval, eventBus.on | Cleaned up |
| src/components/DashboardPanel/DashboardPanel.tsx | setInterval, eventBus.on (x4) | All cleaned up |
| src/components/LiveCognition/MissionControl.tsx | eventBus.on (x2), setInterval | All cleaned up |
| src/components/EventsTimeline/EventsTimeline.tsx | subscribeAll, addEventListener | All cleaned up |
| src/components/AquariumPanel/hooks/useAquariumEngine.ts | requestAnimationFrame, eventBus.on | All cleaned up |
| src/components/AquariumPanel/PerfOverlay.tsx | requestAnimationFrame | Cleaned up |
| src/stores/useSystemStatus.ts | eventBus.on (x5), setTimeout | All cleaned up |
| src/stores/useChatStore.ts (hydration) | subscribeAll, addEventListener | All cleaned up |
| src/bridges/usePoolStatus.ts | eventBus.on | Cleaned up |
| src/bridges/useRoutingIntelligence.ts | eventBus.on (x3) | Cleaned up |
| src/kernel/services/race-executor.ts | AbortController | Aborts all in finally |
| src/kernel/services/mcp-service.ts | AbortController + fetch | Timeout + cleanup in finally |
| src/kernel/services/proxy-health-monitor.ts | fetch + intervals | Timeout + stop() clears all |
| src/llm/core/flyweight.ts | pool Map, timestamps Map | MAX_SIZE=1000 + TTL eviction |
| src/llm/decorators/circuit-breaker.ts | state data | Scalar values, reset on change |
| src/llm/decorators/rate-limit-decorator.ts | perProvider Map | MAX_PROVIDERS=100 + cleanup |
| src/core/Kernel.ts | eventLog, decisions, violations | Ring buffer + slice caps |
| src/core/TaskQueue.ts | throughputWindow | Filtered in getStats() |

---

## Audit Methodology

This audit was conducted by systematically scanning all 772 source files in the `src/` directory, with 40+ files examined in full depth. The audit covered six leak categories using both automated pattern matching and manual code review:

- **useEffect Cleanup:** Every `useEffect` hook in component files was reviewed for missing cleanup returns, untracked timeouts/intervals, and unsubscribed event listeners.
- **SSE/Stream/HTTP:** All files touching WebSocket, EventSource, ReadableStream, AbortController, and `fetch` were reviewed for unclosed connections, missing abort signals, and incomplete error-path cleanup.
- **Unbounded Data Structures:** All Maps, Sets, arrays, and caches in services and stores were analyzed for growth without eviction, missing size limits, or stale entry accumulation.
- **Audio/SpeechRecognition/Media:** All `AudioContext`, `AudioNode`, `SpeechRecognition`, `URL.createObjectURL`, `Worker`, and `BroadcastChannel` usage was reviewed for missing disconnect/stop/close/revoke calls.
- **Timer Lifecycle:** All `setTimeout`, `setInterval`, and `requestAnimationFrame` calls were traced through their lifecycle to verify cancellation on unmount or destroy.
- **Async Outlive Component:** All async functions in components and services were checked for post-await state updates on potentially unmounted/destroyed owners.

Test files (`.test.ts`, `.test.tsx`), `node_modules`, and configuration files were excluded from the audit. Style issues, minor optimizations, and non-resource bugs were ignored unless they directly cause leaks.
```