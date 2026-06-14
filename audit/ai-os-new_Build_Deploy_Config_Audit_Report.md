# AI-OS-NEW — Build, Deploy & Config Audit Report

764 TypeScript/TSX source files • 3 audit domains • 55 findings

## Focus Areas
- Docker, nginx, server startup, and environment variable handling
- Missing or incorrect config values
- Broken dev/prod parity
- Build scripts, packaging, and repo setup problems
- Incorrect defaults that break production behavior
- Missing paths, bad imports, or startup-time failures
- CI/CD or runtime configuration issues that prevent the app from starting or working correctly

---

## Executive Summary

This audit examined the ai-os-new codebase for build, deployment, and configuration problems across 764 source files. Three parallel audit agents covered: (1) Docker, nginx, server startup and environment variables; (2) kernel startup, imports, and packaging; (3) CI/CD, config cascade, and runtime configuration. A total of 55 findings were identified: 5 CRITICAL, 15 HIGH, 20 MEDIUM, and 15 LOW.

| Severity | Count | Key Theme |
|----------|-------|------------|
| CRITICAL | 5 | nginx envsubst missing, /proxy/* routes absent, config overlay compounding, Dexie module-scope crash, slaMode mismatch |
| HIGH | 15 | CSP drops on static assets, localhost fallbacks in production, sqlite blasts bundle, circular imports, split-brain config rollback, shallow settings merge, hardcoded buildId |
| MEDIUM | 20 | Dev-only CORS origins, restrictive prod CSP, missing VITE_ build args, uncontainerized dev servers, hardcoded feature flags, localhost URLs in provider catalog, fragile Worker paths |
| LOW | 15 | Missing env documentation, wrong dependency section, weak healthcheck, X-Frame-Options inconsistency, Chrome-only APIs, no PWA config |

### Top Systemic Patterns

- **Production is completely broken out of the box:** nginx envsubst never runs (BLD-01), all `/proxy/*` LLM routes 404 in Docker (BLD-02), and CSP drops `'unsafe-eval'` breaking runtime JS (BLD-08). The Docker image will not serve LLM traffic.

- **Config cascade is fundamentally broken:** overlays compound against mutated CONFIG instead of original defaults (BLD-04), rollback doesn't clear overlays creating split-brain (BLD-15), settings merge is shallow losing new fields (BLD-18), and `slaMode` type/validation mismatch silently drops valid values (BLD-03).

- **Dev/prod parity is severely broken:** nginx has `/api/` but not `/proxy/*` (dev-only vite routes), CSP differs between dev and prod, localhost fallbacks in sandbox/tool-executor/mcp/adapters, VITE_* vars can't be overridden at deploy time without rebuild.

- **Module-scope singletons crash SSR/test environments:** Dexie DB, CrossTabStateSync, ProviderCatalogService, StorageManager all instantiate browser-only objects at import time.

- **sql.js blasts the main bundle:** Top-level imports of `sqlite-storage` in `runtime.ts` and `useChatStore.ts` force 200KB+ of sql.js wrapper into the main chunk regardless of whether SQLite storage is used.

---

## Findings

### CRITICAL (5 findings)

#### BLD-01 [CRITICAL] nginx ${API_UPSTREAM} env var substitution never happens — container won't start
**Files:** `docker/nginx.conf`, `docker/nginx-ssl.conf`, `Dockerfile`

**Problem:** Both nginx configs use shell-style `${API_UPSTREAM:-https://api.openrouter.ai}` syntax. nginx does NOT perform environment variable substitution on its own — it requires `envsubst` to preprocess the config. The Dockerfile simply copies the config as-is and runs nginx directly. There is no ENTRYPOINT script and no `envsubst` invocation anywhere. nginx will fail to parse the `${...}` syntax and refuse to start.

**Fix:** Add an entrypoint script that runs `envsubst` before starting nginx. Rename configs to `.template` suffix. Alternatively, remove `${API_UPSTREAM}` and hardcode the default, accepting that changing upstream requires a rebuild.

---

#### BLD-02 [CRITICAL] All /proxy/* LLM routes missing from nginx — every LLM call 404s in production
**Files:** `docker/nginx.conf`, `docker/nginx-ssl.conf`, `vite.config.ts`

**Problem:** The LLM adapters route almost all provider traffic through `/proxy/*` paths (gemini, openrouter, groq, nvidia, cerebras, cloudflare, openai, together, fireworks, deepseek, etc.). In dev, `vite.config.ts` handles these routes. In production Docker, nginx only has `location /api/`. There are no `/proxy/*` locations in any nginx config. Every single LLM API call will return the SPA's index.html instead of being proxied, causing complete LLM failure in production.

**Fix:** Add all `/proxy/*` location blocks to the nginx configs (both dev and SSL), mirroring the Vite proxy routes. Or use a dynamic nginx map + single generic proxy location. Alternatively, change adapters to use direct URLs in production (controlled by `import.meta.env.PROD`).

---

#### BLD-03 [CRITICAL] slaMode type/validation mismatch silently drops valid values
**Files:** `kernel/contracts/settings.ts`, `kernel/services/settings-service.ts`

**Problem:** The `SystemSettings` type declares `slaMode: 'BALANCED' | 'PERFORMANCE' | 'EXPERIMENTAL' | 'FREE_FIRST'` but `validateSettings()` only accepts `['LOW_LATENCY', 'HIGH_QUALITY', 'BALANCED', 'ECONOMY', 'FREE_FIRST']`. TypeScript allows `'PERFORMANCE'` and `'EXPERIMENTAL'` at compile time, but at runtime they are silently dropped. Conversely, `'LOW_LATENCY'` and `'HIGH_QUALITY'` pass validation but aren't in the type. This causes production config changes to be silently ignored.

**Fix:** Synchronize both lists. Decide on canonical values and update either the type or the validation array.

---

#### BLD-04 [CRITICAL] ConfigService overlays merge against already-mutated CONFIG, not original defaults
**Files:** `kernel/services/config-service.ts`, `kernel/services/config-registry.ts`

**Problem:** `ConfigService.updateMonitoring(partial)` calls `setConfig('monitoring', deepMerge(CONFIG.monitoring, partial))`. But `CONFIG.monitoring` may have already been mutated by a prior `setConfig()` call. Successive overlays compound incorrectly — each update merges on top of the already-mutated global. On next init, `applyOverlays` re-merges against the mutated CONFIG, double-applying changes.

**Fix:** Store original defaults separately (deep-clone at module init) and merge overlays against `ORIGINAL_DEFAULTS` instead of the live CONFIG. Always compute the result as `deepMerge(ORIGINAL_DEFAULTS.section, overlays.section)`.

---

#### BLD-05 [CRITICAL] Dexie DB instantiated at module scope crashes SSR
**File:** `kernel/services/database-service.ts`

**Problem:** `export const dexieDb = new SuperAgentsDB()` runs the Dexie constructor at module load time. The constructor calls `this.version(N).stores({...})` and registers Dexie hooks, all of which require IndexedDB. In any SSR/Node context (Vite SSR, test runner without jsdom), this throws because `indexedDB` is undefined.

**Fix:** Wrap instantiation in a lazy singleton. Export a Proxy that defers construction until first access, or use a `getDexieDb()` function.

---

### HIGH (15 findings)

#### BLD-06 [HIGH] Root nginx.conf is dead config with privileged ports — will mislead operators
**Files:** `nginx.conf` (root), `Dockerfile`, `docker/nginx.conf`

**Problem:** The root `nginx.conf` listens on ports 80 and 443 (privileged, requires root), references SSL certs, and has a hardcoded proxy target. It is never used by the Docker setup (the Dockerfile copies from `docker/`). If someone accidentally mounts this file, nginx-unprivileged will fail to bind ports 80/443. The file also has different CSP and proxy settings than the `docker/` versions.

**Fix:** Delete `nginx.conf` from the project root, or clearly rename it to `nginx.conf.example-standalone` with a comment that Docker uses `docker/nginx.conf`.

---

#### BLD-07 [HIGH] VITE_PROXY_URL defaults to wrong port (3001 vs 3002) and is unreachable in production
**Files:** `kernel/services/sandbox-service.ts`, `kernel/services/tool-executor.ts`, `scripts/cors-proxy.mjs`, `env.example`

**Problem:** Both `sandbox-service.ts` and `tool-executor.ts` default `VITE_PROXY_URL` to `http://localhost:3001/fetch`. But the CORS proxy (`cors-proxy.mjs`) listens on port **3002**, not 3001. Port 3001 is the sync-server which has no `/fetch` endpoint. In production Docker, no CORS proxy runs at all, so tool/sandbox fetch operations silently fail.

**Fix:** Change the default to `http://localhost:3002/fetch` in both source files and `.env.example`. For production, either run the CORS proxy as a sidecar container or remove the proxy fallback.

---

#### BLD-08 [HIGH] Production CSP removes 'unsafe-eval' — will break runtime JS
**File:** `docker/nginx-ssl.conf`

**Problem:** The dev nginx CSP has `script-src 'self' 'unsafe-inline' 'unsafe-eval'` but the production (SSL) config has `script-src 'self' 'unsafe-inline'` — dropping `'unsafe-eval'`. The project depends on `meriyah` (JS parser) and `@huggingface/transformers` (ML runtime), both of which may use dynamic code generation. If any dependency uses `new Function()` or `eval()`, the production CSP will cause silent runtime errors.

**Fix:** Keep `'unsafe-eval'` in production CSP (consistent with dev), or audit all dependencies for `eval`/`new Function` usage and add nonce-based CSP, or add `'wasm-unsafe-eval'` at minimum for WASM dependencies.

---

#### BLD-09 [HIGH] nginx add_header in location blocks drops CSP from parent — security bypass on all static assets
**Files:** `docker/nginx.conf`, `docker/nginx-ssl.conf`

**Problem:** Both nginx configs define security headers (including CSP) at the `server` block level, then define a `location` block for static assets that adds `Cache-Control` and other headers using `add_header`. In nginx, when any `add_header` is used in a location block, ALL `add_header` directives from the parent server block are ignored for that location. This means all static assets (JS, CSS, WASM, fonts) are served **without** Content-Security-Policy and **without** Strict-Transport-Security.

**Fix:** Duplicate ALL security headers in every location block that uses `add_header`, including CSP and HSTS.

---

#### BLD-10 [HIGH] SYNC_SECRET logic contradiction — server simultaneously requires and ignores the secret
**File:** `server/sync-server.mjs`

**Problem:** Lines 11-16 read `SYNC_SECRET` and exit immediately if missing. But line 125 reads `SYNC_SECRET` again with `|| ''` default, and line 129 allows all WebSocket connections if it's empty. Also, `SYNC_SECRET` is not documented in `.env.example` or `docker-compose.yml`, so deployers won't know to set it, and the sync-server won't start in Docker.

**Fix:** Remove the contradictory default on line 125. Add `SYNC_SECRET` to `.env.example` and `docker-compose.yml`. Make the sync-server a separate Docker service or dev-only.

---

#### BLD-11 [HIGH] Circular import cycle between instances/resolver/runtime/security
**Files:** `kernel/instances.ts`, `kernel/resolver.ts`, `kernel/runtime.ts`, `kernel/security.ts`

**Problem:** `instances.ts` imports from `resolver.ts`, which imports from `runtime.ts`, which imports from `security.ts`, which imports from `instances.ts` — forming a cycle. Currently works due to ES module live-binding semantics, but this is fragile — any bundler optimization, tree-shaking pass, or reordering could cause `storageAdapter` to be undefined at the time `security.ts` evaluates, crashing the entire app at startup.

**Fix:** Break the cycle by having `security.ts` import `storageAdapter` directly from a dedicated `storage-adapter-instance` module instead of from `instances`.

---

#### BLD-12 [HIGH] Hardcoded localhost fallbacks for proxy URLs break in Docker/production
**Files:** `kernel/services/sandbox-service.ts`, `kernel/services/tool-executor.ts`

**Problem:** Both files use `import.meta.env.VITE_PROXY_URL || 'http://localhost:3001/fetch'` as a fallback. In production Docker, `localhost:3001` is not reachable (the proxy server doesn't exist in the container). If `VITE_PROXY_URL` is not set at build time, sandbox fetch and tool executor silently fail or hang.

**Fix:** Remove the localhost fallback. Fail explicitly when the env var is missing in production, or provide a no-op default that returns a clear error rather than hanging.

---

#### BLD-13 [HIGH] useChatStore imports deprecated sqlite-storage, pulling sql.js into main bundle
**Files:** `stores/useChatStore.ts`, `kernel/services/storage/sqlite-storage.ts`

**Problem:** `useChatStore.ts` imports `waitForStorage` from `sqlite-storage.ts`. This module has a top-level import `initSqlJs from 'sql.js'` which forces the sql.js JS wrapper (200KB+) into the main bundle even when `CONFIG.storage.useSqlite === false`. The sql.js WASM binary is dynamically imported, but the JS wrapper is always loaded, inflating bundle size.

**Fix:** Replace the `sqlite-storage` import with the Dexie-backed storage layer resolution via `runtime.getService('storageLayer')`.

---

#### BLD-14 [HIGH] runtime.ts always imports createSqliteStorage — bloat main chunk
**File:** `kernel/runtime.ts`

**Problem:** `import { createSqliteStorage } from './services/storage/sqlite-storage'` is a top-level import. This pulls the entire 1225-line `sqlite-storage.ts` module (and its sql.js dependency) into the runtime module, which is imported by virtually every component. The SQLite storage code is always in the main bundle chunk.

**Fix:** Use a dynamic import inside `RuntimeManager.start()`: `const { createSqliteStorage } = await import('./services/storage/sqlite-storage')`.

---

#### BLD-15 [HIGH] ConfigHistoryService.rollback doesn't clear ConfigService overlays — split-brain state
**Files:** `kernel/services/config-history.ts`, `kernel/services/config-service.ts`

**Problem:** `rollback()` calls `replaceConfig(nextConfig)` which replaces the entire live CONFIG. But `ConfigService.overlays` is not reset. After rollback, `ConfigService.getMonitoring()` still merges stale overlays on top of the rolled-back CONFIG, producing values that were never intended. The overlays and CONFIG are in a split-brain state.

**Fix:** After `replaceConfig()`, the rollback should also call `ConfigService.clearOverlays()` (a new method that resets `this.overlays = {}` and re-persists).

---

#### BLD-16 [HIGH] OpenRouter adapter falls back to http://localhost:5173 in non-browser contexts
**File:** `llm/openrouter/openrouter-adapter.ts`

**Problem:** `this.defaultOrigin = options?.origin ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')`. The `defaultOrigin` is sent as the `HTTP-Referer` header to OpenRouter. In SSR or non-browser environments, this falls back to `localhost:5173`, leaking internal dev URLs in production API calls.

**Fix:** Replace the localhost fallback with the production origin or an env var: `import.meta.env.VITE_APP_ORIGIN || ''`. If no origin is known, leave it empty.

---

#### BLD-17 [HIGH] FeatureFlagService has no persistence — flags reset on every reload
**File:** `kernel/services/feature-flag-service.ts`

**Problem:** `FeatureFlagService` stores flags only in memory. The `init()` method is empty — it never loads saved state from any storage. Any feature flag toggles made at runtime are silently lost when the page is refreshed or the app is restarted. Operators cannot enable/disable features without code changes.

**Fix:** Inject a database dependency and load/save flag state in `init()`/`setEnabled()`. Add persistence similar to `SettingsService`.

---

#### BLD-18 [HIGH] Settings merge is shallow — new default fields in nested objects lost for existing users
**File:** `kernel/services/settings-service.ts`

**Problem:** When loading saved settings: `this.settings = { ...DEFAULTS, ...saved }`. This is a shallow spread, so if a saved `themeConfig` or `notificationPrefs` is present, it completely replaces the default. If a new code version adds a field to `ThemeConfig` (e.g., `fontSize`), existing users won't get it because their saved object (without `fontSize`) overwrites the default.

**Fix:** Deep-merge saved settings with defaults for nested objects: `themeConfig: { ...DEFAULTS.themeConfig, ...saved.themeConfig }`, etc.

---

#### BLD-19 [HIGH] Module-level singletons with side effects crash in SSR/test environments
**Files:** `kernel/services/cross-tab-state.ts`, `kernel/services/provider-catalog-service.ts`

**Problem:** `crossTabStateSync = new CrossTabStateSync()` runs `this.init()` in its constructor, which calls `new BroadcastChannel(...)` and `window.addEventListener('storage', ...)` immediately at module import time. In SSR or CI environments where `BroadcastChannel` or `window` are unavailable, importing these modules crashes the process.

**Fix:** Defer initialization to an explicit `init()` method. Export a lazy proxy or factory instead. Gate the constructor with `typeof window !== 'undefined'`.

---

#### BLD-20 [HIGH] buildId hardcoded as 'a9f3b2c' — every build claims to be the same version
**File:** `kernel/services/config-registry.ts`

**Problem:** `buildId: 'a9f3b2c'` is a static string never updated during the build process. It is impossible to identify which build is running in production, defeating debugging, cache-busting, and version tracking. The `version` field is also hardcoded as `'1.0.0'`.

**Fix:** Inject via `import.meta.env.VITE_BUILD_ID` at build time (similar to `VITE_APP_VERSION` already in `vite.config.ts`). Add a `VITE_BUILD_ID` injection using `git rev-parse --short HEAD` or a CI-provided hash.

---

### MEDIUM (20 findings)

#### BLD-21 [MEDIUM] CORS proxy hardcodes localhost:5173 as allowed origin
**File:** `scripts/cors-proxy.mjs`

**Problem:** The CORS proxy hardcodes `Access-Control-Allow-Origin: http://localhost:5173`. If the dev server runs on a different port, CORS will block responses. In production, all cross-origin requests would fail.

**Fix:** Read the allowed origin from an env var: `const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';`

---

#### BLD-22 [MEDIUM] Production CSP connect-src too restrictive — custom providers blocked
**File:** `docker/nginx-ssl.conf`

**Problem:** The production CSP has `connect-src` listing only specific providers. Users who configure custom LLM providers (self-hosted Ollama, local servers, non-listed API providers) will have their connections blocked. The dev config uses `connect-src 'self' https: wss:` which allows any HTTPS.

**Fix:** Use `connect-src 'self' https: wss:` in production as well, matching dev. Or add all provider domains used by the adapters.

---

#### BLD-23 [MEDIUM] Docker build doesn't forward VITE_* build args — production values get wrong defaults
**Files:** `Dockerfile`, `.env.example`

**Problem:** Vite's `import.meta.env.VITE_*` values are replaced **at build time**. The Dockerfile's build stage doesn't accept any `ARG` for VITE_* variables. This means `VITE_PROXY_URL` and any other VITE_* variable gets its hardcoded default baked permanently into the Docker image. Deployers cannot override at runtime without rebuilding.

**Fix:** Add build args for VITE_* variables in the Dockerfile and `docker-compose.yml`. Pass them through: `ARG VITE_PROXY_URL`, `ENV VITE_PROXY_URL=$VITE_PROXY_URL`.

---

#### BLD-24 [MEDIUM] Sync server and CORS proxy not containerized — missing from Docker but referenced by app
**File:** `docker-compose.yml`, `server/sync-server.mjs`, `scripts/cors-proxy.mjs`

**Problem:** The `sync-server.mjs` and `cors-proxy.mjs` are dev-only Node.js servers not included in the Docker setup. However, the frontend code references them (`sandbox-service` defaults to `localhost:3001`, `mcp-service` lists `localhost:3001` as an MCP server). In production, these localhost URLs will silently fail.

**Fix:** For production, make the CORS proxy fallback conditional on `VITE_PROXY_URL` being set. Add a proxy service to `docker-compose.yml` if CORS proxying is needed in production.

---

#### BLD-25 [MEDIUM] keep-vite-alive.js uses CJS require() but project is ESM
**File:** `keep-vite-alive.js`

**Problem:** The project has `"type": "module"` in `package.json`, making all `.js` files ESM. But `keep-vite-alive.js` uses `const { spawn } = require('child_process')` which is CJS syntax. Running `node keep-vite-alive.js` will throw `ReferenceError: require is not defined`.

**Fix:** Rename to `keep-vite-alive.cjs` to explicitly mark as CJS, or convert to ESM syntax. Or delete it since `run-dev.mjs` already serves the same purpose.

---

#### BLD-26 [MEDIUM] Root nginx.conf proxies without path stripping — wrong API path
**File:** `nginx.conf` (root)

**Problem:** `location /api/ { proxy_pass https://api.openrouter.ai; }` without trailing slash on `proxy_pass`. A request to `/api/v1/chat/completions` will be proxied to `https://api.openrouter.ai/api/v1/chat/completions` (preserving the `/api/` prefix), causing double `/api/api/` paths or 404s.

**Fix:** Add trailing slash: `proxy_pass https://api.openrouter.ai/;` Or better, remove this dead config file entirely (see BLD-06).

---

#### BLD-27 [MEDIUM] Bootstrap feature flags are hardcoded, not configurable from environment
**File:** `kernel/bootstrap.ts`

**Problem:** Feature flags like `ENABLE_SQLJS`, `ENABLE_EVENT_BRIDGE`, `ENABLE_CAUSAL_DEBUGGER`, etc. are hardcoded as `const ENABLE_X = true`. There is no way to disable these subsystems in production without a code change. In Docker, all subsystems are always enabled, consuming memory even if unused.

**Fix:** Read from `import.meta.env`: `const ENABLE_SQLJS = import.meta.env.VITE_ENABLE_SQLJS === 'true';` etc.

---

#### BLD-28 [MEDIUM] MCP service hardcodes localhost URLs for default servers
**File:** `kernel/services/mcp-service.ts`

**Problem:** Default MCP server configs use `http://localhost:3001` and `http://localhost:3002`. In production, these will fail to connect and generate connection errors. The defaults are dev-only assumptions.

**Fix:** Make MCP default servers configurable via CONFIG or `import.meta.env`, and omit localhost defaults in production builds.

---

#### BLD-29 [MEDIUM] Provider catalog hardcodes localhost for local providers — mixed-content errors in production
**File:** `kernel/services/provider-catalog-service.ts`

**Problem:** Ollama (`http://localhost:11434/v1`) and LM Studio (`http://localhost:1234/v1`) entries use plain HTTP. In production (served over HTTPS), these trigger mixed-content errors and are blocked by the browser. The `autoDetected: true` flag means the system probes these URLs at startup, generating errors.

**Fix:** Only include local provider entries when `import.meta.env.DEV` is true. In production, omit localhost entries from `DEFAULT_CATALOG` entirely. Make URLs configurable via env vars.

---

#### BLD-30 [MEDIUM] External Google Fonts @import blocks rendering in air-gapped environments
**File:** `src/index.css`

**Problem:** `@import url("https://fonts.googleapis.com/css2?family=Inter...");` blocks CSS parsing until the font CSS downloads. In air-gapped, intranet, or CDN-blocked environments, this causes multi-second FOIT and the request may time out, delaying the entire app's first paint.

**Fix:** Self-host the fonts or use `font-display: swap` with a local fallback. Replace `@import` with a `<link>` tag in `index.html` or use Vite's `@font-face` pattern.

---

#### BLD-31 [MEDIUM] ConfigService.getRouter() bypasses overlay system; updateRouter() is a no-op
**File:** `kernel/services/config-service.ts`

**Problem:** `getRouter()` reads from the `RouterConfigManager` singleton, completely bypassing the `ConfigService` overlay/persistence system. `updateRouter()` is deprecated and does nothing. If a user expects `ConfigService` to manage all config uniformly, router config changes appear to be silently ignored.

**Fix:** Either remove `getRouter()`/`updateRouter()` from `ConfigService` and document that router config goes through `RouterConfigManager` directly, or have `ConfigService.getRouter()` read from its own overlays.

---

#### BLD-32 [MEDIUM] Playwright e2e config lacks CI hardening — no retries, no artifact output, hardcoded port
**File:** `e2e/playwright.config.ts`

**Problem:** `baseURL` hardcoded to `localhost:5173` with no env override. No retries conditional on CI. No reporter config for CI. No screenshot/video/trace for debugging. No projects for multi-browser testing. `reuseExistingServer: true` can mask a failing dev server in CI.

**Fix:** Add CI-aware config: `retries: process.env.CI ? 2 : 0`, `baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173'`, `reporter: process.env.CI ? 'html' : 'list'`, `trace: 'on-first-retry'`.

---

#### BLD-33 [MEDIUM] Test setup calls await runtime.start() at module level — fragile, blocks all tests on failure
**File:** `src/tests/setup.ts`

**Problem:** The file ends with `await runtime.start()` at top level. If runtime fails to start (IndexedDB init fails, service dependency missing), the error is an unhandled rejection that crashes the entire test suite with a cryptic error. Every test file pays the cost of runtime initialization even if it doesn't need it.

**Fix:** Wrap in try-catch with a clear error message. Use Vite's `globalSetup` instead of `setupFiles` for one-time initialization.

---

#### BLD-34 [MEDIUM] StorageManager auto-creates IndexedDB driver in constructor — crashes without IndexedDB
**File:** `core/storage.ts`

**Problem:** `new StorageManager()` immediately creates `new IndexedDBStorageDriver()`, which opens an IndexedDB connection. The module-level export `export const storage = new StorageManager()` means this runs at import time. In environments without IndexedDB (SSR, some CI runners), `indexedDB.open()` will throw, crashing the app before initialization.

**Fix:** Defer IndexedDB driver creation to first use. Only register memory and localStorage drivers in the constructor. Add IndexedDB driver lazily when first requested.

---

#### BLD-35 [MEDIUM] ConfigHistoryService commits initial snapshot before ConfigService overlays are applied
**File:** `kernel/services/config-history.ts`

**Problem:** The constructor calls `this.commit(CONFIG, 'System', 'Initial configuration seed')`. If `ConfigHistoryService` is instantiated at module level, this runs before `ConfigService.init()` has applied overlays. The 'initial' snapshot captures bare defaults, not the actual effective config after overlay application.

**Fix:** Move the initial commit to an `init()` method that runs after `ConfigService.init()` has applied overlays.

---

#### BLD-36 [MEDIUM] No .env.production template — no guidance for production env vars
**File:** `.env.example`

**Problem:** Only `.env.example` exists, which is dev-focused. There is no `.env.production` template or documentation for production-specific variables. `VITE_PROXY_URL` has a localhost fallback, `VITE_APP_ORIGIN` doesn't exist, `VITE_BUILD_ID` doesn't exist. Operators have no reference for what must be set in production.

**Fix:** Create `.env.production.example` listing all required production variables. Add validation at startup that critical env vars are set in production mode.

---

#### BLD-37 [MEDIUM] Provider catalog mutates EVENTS constant at module level
**File:** `kernel/services/provider-catalog-service.ts`

**Problem:** `(EVENTS as unknown as Record).PROVIDER_CATALOG_PROBED = 'provider:catalog:probed'` patches the `EVENTS` object at module level. If `EVENTS` is ever frozen, this will throw. It also means event names exist only if this module has been imported, creating import-order dependencies.

**Fix:** Define all event names centrally in `event-names.ts`. Remove the runtime mutation of `EVENTS`.

---

#### BLD-38 [MEDIUM] Web Worker URL `../services/sandbox.worker.ts` is a fragile relative path
**File:** `kernel/services/sandbox-service.ts`

**Problem:** `new Worker(new URL('../services/sandbox.worker.ts', import.meta.url), { type: 'module' })` uses a relative path that depends on the file's location. If the file is moved during refactoring, the worker URL breaks silently at runtime (Worker constructor doesn't throw on invalid URLs — it only fires an error event).

**Fix:** Use an alias-based import path or a dedicated constant. Add a runtime check that the Worker loaded successfully before the first `postMessage`.

---

#### BLD-39 [MEDIUM] Duplicate isPrivateIP function in cors-proxy.mjs
**File:** `scripts/cors-proxy.mjs`

**Problem:** `isPrivateIP` is defined twice — first on lines 9-26, then again on lines 44-64. The second definition shadows the first. Could lead to divergent logic if one copy is updated but not the other.

**Fix:** Remove the duplicate definition (lines 44-64). Keep only one `isPrivateIP` function.

---

#### BLD-40 [MEDIUM] Bootstrap dead variables: originalSetInterval and activeIntervals
**File:** `kernel/bootstrap.ts`

**Problem:** `originalSetInterval` and `activeIntervals` are defined at module scope but never used. Leftover debugging code that was partially removed.

**Fix:** Remove both variables.

---

### LOW (15 findings)

#### BLD-41 [LOW] .env.example missing SYNC_SECRET, API_UPSTREAM, NGINX_CONFIG, CORS_ORIGIN, and SYNC_ORIGINS
**File:** `.env.example`

**Problem:** Several environment variables used by infrastructure are not documented in `.env.example`: `SYNC_SECRET` (required by sync-server), `API_UPSTREAM` (used in nginx), `NGINX_CONFIG` (build arg), `CORS_ORIGIN`, `SYNC_ORIGINS`.

**Fix:** Add all infrastructure env vars to `.env.example` with comments explaining their purpose and defaults.

---

#### BLD-42 [LOW] vite-plugin-wasm listed in dependencies instead of devDependencies
**File:** `package.json`

**Problem:** `vite-plugin-wasm` is a Vite build plugin only needed during build. It's listed in `dependencies` instead of `devDependencies`, increasing the install footprint for `npm install --production`.

**Fix:** Move `vite-plugin-wasm` from `dependencies` to `devDependencies` in `package.json`.

---

#### BLD-43 [LOW] Docker healthcheck doesn't verify API proxy availability
**Files:** `Dockerfile`, `docker-compose.yml`

**Problem:** The healthcheck only verifies nginx serves `index.html`. It doesn't check whether `/api/` or `/proxy/*` upstreams are reachable. A container could be 'healthy' while all API proxying is broken.

**Fix:** Add a secondary health check endpoint in nginx that verifies the upstream is reachable, or add `/healthz` that checks the proxy configuration.

---

#### BLD-44 [LOW] X-Frame-Options inconsistency between dev and prod static asset blocks
**Files:** `docker/nginx.conf`, `docker/nginx-ssl.conf`

**Problem:** Dev nginx config sets `X-Frame-Options: SAMEORIGIN` for static assets. Prod (SSL) config sets `X-Frame-Options: DENY`. This means the app behaves differently in dev vs prod regarding iframe embedding.

**Fix:** Use the same `X-Frame-Options` value in both configs. If the app should never be framed, use `DENY` in both.

---

#### BLD-45 [LOW] Root nginx.conf CSP weaker than Docker configs
**File:** `nginx.conf` (root)

**Problem:** The root `nginx.conf` CSP is missing `base-uri 'self'` and `frame-src 'self' blob:` directives present in the `docker/` configs. If someone copies it as a template, they'll get a weaker CSP.

**Fix:** Remove the root `nginx.conf` or sync its CSP with the `docker/` versions.

---

#### BLD-46 [LOW] security.ts singleton at module scope with browser-only dependency
**File:** `kernel/security.ts`

**Problem:** `export const securityService = new SecurityService()` is evaluated at module load time. It imports `storageAdapter` from `instances.ts`, triggering the entire instances/resolver/runtime circular chain. In SSR, this forces evaluation of browser-only code paths.

**Fix:** Use lazy initialization: `export function getSecurityService()` that creates the instance on first call.

---

#### BLD-47 [LOW] EventBus singleton at module scope with validator side effects
**File:** `kernel/events/event-bus.ts`

**Problem:** `export const eventBus = new EventBus(true, rootLogger)` creates the singleton at module scope. The `EventBus` constructor calls `registerAllValidators()` which iterates over `EventValidators`. If `schema-types` has any import-time side effect that depends on browser APIs, this could crash in SSR.

**Fix:** Consider lazy initialization or verify that `EventValidators` has no browser-dependent side effects.

---

#### BLD-48 [LOW] useKeyStore module-level side effects without SSR guard
**File:** `stores/useKeyStore.ts`

**Problem:** `window.addEventListener('beforeunload', cleanupKeyStore)` is executed at module scope. While guarded by `typeof window !== 'undefined'`, this pattern means the module has side effects on import, causing issues with tree-shaking and test isolation.

**Fix:** Move these into the `ensureInitialized()` function or a dedicated initialization hook.

---

#### BLD-49 [LOW] Pricing sync hardcoded OpenRouter URL
**File:** `kernel/services/pricing-service.ts`

**Problem:** `fetch('https://openrouter.ai/api/v1/models')` is hardcoded. In environments where external API calls are restricted (corporate firewalls, air-gapped deployments), this will fail silently.

**Fix:** Make the sync URL configurable via CONFIG or make sync opt-in: `if (CONFIG.pricing.syncEnabled) { /* fetch */ }`

---

#### BLD-50 [LOW] service-list.ts stale — doesn't match actual registered services
**File:** `kernel/services/service-list.ts`

**Problem:** `BOOTSTRAP_SERVICES` lists 28 services but the phase registration files register 60+. Services like `debateEngine`, `strategyRegistry`, `templateService`, etc. are missing. While currently unused, if someone relies on it for lifecycle management, they'll get an incomplete picture.

**Fix:** Either remove `BOOTSTRAP_SERVICES` entirely or update it to include all registered services.

---

#### BLD-51 [LOW] CSS @import is render-blocking — creates waterfall for font loading
**File:** `src/index.css`

**Problem:** CSS `@import` is render-blocking and creates a waterfall: browser must download `index.css`, parse it, discover the `@import`, download Google Fonts CSS, then download actual font files. This adds 2+ round trips before first paint.

**Fix:** Replace with a `<link>` tag in `index.html` or use Vite's `@font-face` pattern with self-hosted fonts.

---

#### BLD-52 [LOW] Memory watchdog relies on Chrome-only performance.memory API
**File:** `kernel/utils/memory-watchdog.ts`

**Problem:** `performance.memory` is a non-standard Chrome-only API. In Firefox and Safari, the watchdog is silently disabled, meaning memory leak detection is unavailable for a significant portion of users.

**Fix:** Document the Chrome-only limitation. Consider adding `performance.measureUserAgentSpecificMemory()` as an alternative for browsers that support it.

---

#### BLD-53 [LOW] No service worker or PWA configuration — offline support missing
**Files:** `vite.config.ts`, `index.html`

**Problem:** The app uses IndexedDB and localStorage extensively for persistence but has no service worker or PWA manifest. The app cannot function offline and will show a blank page if the server is unreachable. No `vite-plugin-pwa` is configured.

**Fix:** If offline support is desired, add `vite-plugin-pwa` and a `manifest.json`. If not, document that the app requires network connectivity.

---

#### BLD-54 [LOW] PluginSDK imports module-level singletons without validation
**File:** `core/PluginSDK.ts`

**Problem:** Imports `eventBus` and `db` at module level. If a plugin is loaded before the runtime has initialized these singletons, the plugin's `getContext()` will access uninitialized objects with no error message.

**Fix:** Add guards in `getContext()`: if `eventBus` or `db` are not initialized, throw a clear error like `'Cannot create plugin context: runtime not initialized'`.

---

#### BLD-55 [LOW] Resolver isDev variable computed but never used
**File:** `kernel/resolver.ts`

**Problem:** `const isDev = typeof location !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(location.hostname)` is computed on every Proxy property access but never referenced. Dead code that also uses `location` which would be undefined in SSR.

**Fix:** Remove the unused `isDev` variable.