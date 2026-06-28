# Full State & Memory Architecture Audit

**Date:** 2026-05-30
**Codebase:** Super-Agents OS (550+ TS/TSX files)
**Auditor:** OpenCode AI

---

# Table of Contents

1. [Complete State Inventory](#1-complete-state-inventory)
2. [Global Memory Flow Map](#2-global-memory-flow-map)
3. [Duplicate State Report](#3-duplicate-state-report)
4. [Source of Truth Report](#4-source-of-truth-report)
5. [Storage Consolidation Opportunities](#5-storage-consolidation-opportunities)

---

# 1. Complete State Inventory

## 1.1 Persistent Storage Technologies

| Technology | Tables/Keys | Primary Consumers | Persistence Host |
|---|---|---|---|
| **SQLite (9 tables)** | api_keys, memory_entries, cognitive_traces, chat_sessions, config, roles, skills, debate_sessions, debate_verdicts | KeyRegistry, MemoryEngine, TraceService, ChatService, RoleService, SkillService, DebateService, SettingsService | Dexie `keyValue.sqlite_db_blob` (15s auto-persist) |
| **Dexie (10 tables)** | notes, memories, apiKeys, sessions, roles, cognitiveTraces, traces, skills, connectors, keyValue | DatabaseService wrapper, MemoryEngine, TraceService, ConnectorsPanel, WorkspaceService, SQLite blob store | IndexedDB `super_agents_os_v4` |
| **StorageAdapter (32 namespaces)** | `superagents:*` prefix | 32 kernel services | localStorage |
| **Direct localStorage (15+ keys)** | super_agents_api_keys, agent_journal_v1, chat_bookmarks_v1, locale, hypothesis_votes, recent_files, etc. | Journal, Bookmarks, i18n, HypothesisMarketplace, ProjectOs, ChatPanel | localStorage |
| **BroadcastChannel** | `provider-state-sync` | CrossTabStateSync | BroadcastChannel (fallback: localStorage) |
| **File System Access API** | User-selected directory | WorkspaceService | Native FS handle (persisted in Dexie) |
| **sessionStorage** | `vault_salt_{userId}` | SecurityService | sessionStorage |
| **Raw IndexedDB** | `super_agents_storage.kv_store` | IndexedDBStorageDriver (legacy) | IndexedDB |

## 1.2 All Storage Sources

### S1: SQLite — Primary Data Store
- **Storage Type:** SQLite (sql.js WASM)
- **File:** `src/kernel/services/storage/sqlite-storage.ts:17-93`
- **Data Stored:** 9 tables — api_keys, memory_entries, cognitive_traces, chat_sessions, config, roles, skills, debate_sessions, debate_verdicts
- **Read Operations:**
  - `SqliteKeyStore.getKey/listKeys/where/exportAll` (`:167-219`)
  - `SqliteMemoryStore.getEntry/queryEntries/count` (`:272-300`)
  - `SqliteTraceStore.getTrace/queryTraces/count` (`:356-377`)
  - `SqliteSessionStore.getSession/listSessions/count` (`:441-465`)
  - `SqliteConfigStore.get<T>()` (`:497`)
  - `SqliteRolesStore.loadAll/count` (`:547-580`)
  - `SqliteSkillsStore.loadAll/count` (`:606-636`)
  - `SqliteDebateStore.getSnapshot/listSessions/getVerdict` (`:674-714`)
- **Write Operations:**
  - Every store class has `save*/put/bulkPut/bulkAdd` methods
  - `persistSqliteDb()` called after every write (`:1090`)
- **Delete Operations:**
  - `deleteKey`, `deleteEntry`, `deleteTrace`, `deleteSession`, `clear` on each store
- **Synchronization:**
  - 15s auto-persist to IndexedDB blob (`:973-983`)
  - `beforeunload`, `visibilitychange`, HMR dispose in `src/main.tsx`
  - Sync server (WebSocket + REST) for cross-browser sync (`:785-904`)
- **Dependencies:** Dexie `keyValue` table for blob storage, sql.js WASM
- **Source of Truth:** YES — canonical persistent store
- **Risk:** If SQLite blob corrupts, all data lost. No backup beyond IndexedDB copy.

### S2: Dexie (IndexedDB) — Secondary + Blob Host
- **Storage Type:** IndexedDB via Dexie
- **File:** `src/kernel/services/database-service.ts:14-130`
- **Data Stored:** 10 tables (see above) + SQLite blob in `keyValue`
- **Read Operations:**
  - `DatabaseService.getKv<T>()` (`:147`)
  - Direct table access from ConnectorsPanel (`:95-121`), WorkspaceService (`:171-187`)
- **Write Operations:**
  - `DatabaseService.setKv<T>()` (`:154`)
  - SQLite blob persistence (`sqlite-storage.ts:920-924`)
  - Connector CRUD (`ConnectorsPanel.tsx:105-155`)
- **Source of Truth:** NO for most data (SQLite is SOT). YES for connectors, workspace handle, SQLite blob.
- **Risk:** Dual storage (SQLite + Dexie) creates confusion about which is authoritative.

### S3: StorageAdapter (Namespaced localStorage)
- **Storage Type:** localStorage with `superagents:` prefix
- **File:** `src/kernel/services/storage-adapter.ts:1-50`
- **Data Stored:** 32 namespaces — model catalogs, research findings, persona configs, role libraries, etc.
- **Read Operations:**
  - Each of 32 services calls `adapter.get(key)` on init
- **Write Operations:**
  - Each service calls `adapter.set(key, value)` on mutation
- **Source of Truth:** YES for each service's data
- **Risk:** localStorage is synchronous, blocking main thread. 5MB limit.

### S4: Direct localStorage (Legacy)
- **Storage Type:** Raw localStorage (no prefix)
- **File:** Various (15+ keys across 10+ files)
- **Data Stored:**
  - `super_agents_api_keys` — legacy key recovery
  - `agent_journal_v1` — agent journal entries
  - `chat_bookmarks_v1` — chat bookmarks
  - `locale` — UI language
  - `hypothesis_votes` — hypothesis votes
  - `recent_files` — recent files list
  - `decision_log_v1` — decision log
  - `message_index_v1` — message search index
  - `events_timeline_v1` — event history
- **Source of Truth:** Mixed — some are legacy (superseded by SQLite), some are current
- **Risk:** No prefix collision protection. Multiple components write to same keys.

### S5: SystemKernel State
- **Storage Type:** In-memory + DB persistence
- **File:** `src/kernel/kernel.ts:14-22`
- **Data Stored:** providers metrics, weights, decisions, totalRequests, totalTokens, estimatedCost, explorationFactor, history, violations, activeSLA, runtime, budget
- **Read Operations:** `getState()` returns deep-frozen clone; `getStateSnapshot()` returns mutable clone
- **Write Operations:** `reduce()` via event listeners, `setSLAMode()`, `setBaseWeights()`, etc.
- **Persistence:** DB key `super_agents_kernel_state` via `database.setKv()`, 10s auto-persist
- **Source of Truth:** YES for runtime metrics
- **Risk:** Deep-freeze on read is expensive; mutations happen in-place inside reducers.

### S6: Event Bus
- **Storage Type:** In-memory only
- **File:** `src/kernel/events/event-bus.ts:22-26`
- **Data Stored:** listenerMap, validatorMap, emitCount, strictMode
- **Read Operations:** Every service reads via `.on()` / `.off()`
- **Write Operations:** `.emit()` from all services
- **Source of Truth:** N/A (transport layer)
- **Risk:** Lost on page reload. No persistence.

### S7: Container (DI)
- **Storage Type:** In-memory only
- **File:** `src/kernel/container.ts:14-18`
- **Data Stored:** services Map, factories Map, dependencies Map, resolving Set
- **Source of Truth:** N/A (bootstrap infrastructure)
- **Risk:** Single instance, no persistence. Circular dependency detection is runtime-only.

### S8: AdapterRegistry (LLM)
- **Storage Type:** In-memory only
- **File:** `src/llm/registry/adapter-registry.ts:5-6`
- **Data Stored:** Created adapter instances by provider name
- **Source of Truth:** YES for adapter instances
- **Risk:** Adapters are recreated on each page load. Circuit breaker state is lost (except cross-tab sync).

### S9: Circuit Breaker State
- **Storage Type:** In-memory + cross-tab broadcast
- **File:** `src/llm/decorators/circuit-breaker.ts:33-41`
- **Data Stored:** `{state, failures, successes, lastFailureTime, openSince, currentTimeoutMs}`
- **Cross-tab sync:** Broadcast via `crossTabStateSync.updateCircuitBreaker()`
- **Source of Truth:** Per-adapter instance. Cross-tab state is a mirror.
- **Risk:** State lost on page reload (except cross-tab). Providers may appear healthy when they're not.

### S10: KeyStateStore
- **Storage Type:** In-memory + event-driven
- **File:** `src/kernel/services/key-state-store.ts:14-17`
- **Data Stored:** Map<string, KeyState> with status, healthScore, lastProbe, health, quota, routing weight, flags
- **Source of Truth:** YES for key routing weights
- **Risk:** Rebuilt from probe results on each load. No direct persistence.

### S11: CacheService (Application-level)
- **Storage Type:** In-memory LRU + IndexedDB persistence
- **File:** `src/kernel/services/cache-service.ts:14-20`
- **Data Stored:** LRU cache with TTL, hit/miss counters
- **Persistence:** IndexedDB key `super_agents_llm_cache`, 2s debounced persist
- **Source of Truth:** YES for application-level caching

### S12: Gemini Model Cache
- **Storage Type:** In-memory only
- **File:** `src/llm/gemini/gemini-model-validator.ts:7-10`
- **Data Stored:** Map of per-API-key model sets (TTL 5 min)
- **Source of Truth:** YES for Gemini model validation
- **Risk:** Lost on page reload. Providers re-fetch on next request.

### S13: Message Index
- **Storage Type:** In-memory + localStorage
- **File:** `src/kernel/services/message-index-service.ts:56-62`
- **Data Stored:** IndexedMessage[] (max 5,000) + byRequestId Map
- **Persistence:** localStorage key `message_index_v1`
- **Source of Truth:** YES for message search

### S14: MetricsService
- **Storage Type:** In-memory + IndexedDB
- **File:** `src/kernel/services/metrics-service.ts:31-38`
- **Data Stored:** TimeSeriesPoint[], alerts, per-provider latency/throughput
- **Persistence:** IndexedDB key `super_agents_metrics_history`
- **Source of Truth:** YES for metrics dashboard

### S15: ProviderTracker
- **Storage Type:** In-memory + DB persistence
- **File:** `src/kernel/services/provider-tracker.ts:40-48`
- **Data Stored:** healthEvents (max 200), prevStatuses, latencyWarnings, errorCounts
- **Persistence:** DB keys `provider_tracker_health_events`, `provider_tracker_metrics`
- **Source of Truth:** YES for provider analytics
- **Risk:** Mutates `SystemKernel.state.providers` in-place (architectural concern).

### S16: RouterService
- **Storage Type:** In-memory + ConfigManager persistence
- **File:** `src/kernel/services/provider-router.ts:93-100`
- **Data Stored:** decisionHistory (max 100), simulationHistory, config, latencyWindows
- **Persistence:** Config via RouterConfigManager → DB key `router_config`
- **Source of Truth:** YES for routing decisions
- **Risk:** Config exists in 3 places (see Duplicate State Report).

### S17: LoggerService
- **Storage Type:** In-memory ring buffer
- **File:** `src/kernel/services/logger-service.ts:7-12`
- **Data Stored:** LogEntry[] (max 500)
- **Source of Truth:** YES for log viewing
- **Risk:** Lost on page reload.

### S18: CrossTabStateSync
- **Storage Type:** BroadcastChannel + localStorage fallback
- **File:** `src/kernel/services/cross-tab-state.ts:47-53`
- **Data Stored:** Circuit breaker states, rate limit states, recent errors (100)
- **Source of Truth:** NO — mirror of per-tab state
- **Risk:** Conflicts possible if two tabs update same provider simultaneously.

### S19: FeatureFlagService
- **Storage Type:** In-memory only
- **File:** `src/kernel/services/feature-flag-service.ts:6-7`
- **Data Stored:** 6 boolean flags
- **Source of Truth:** YES for runtime toggles
- **Risk:** Lost on page reload. Resets to defaults.

### S20: SettingsService
- **Storage Type:** In-memory + DB persistence
- **File:** `src/kernel/services/settings-service.ts:118-121`
- **Data Stored:** SystemSettings (theme, notifications, SLA mode, fallback chains, etc.)
- **Persistence:** DB key `super_agents_os_settings`
- **Source of Truth:** YES for user preferences
- **Risk:** Competing copies with CONFIG and RouterConfigManager (see Duplicate State).

### S21: Debates (Dual System)
- **Storage Type:** In-memory + Dexie persistence
- **Files:**
  - Legacy: `src/kernel/services/debate-service.ts:36-58`
  - New: `src/kernel/services/debate-runtime/debate-engine.ts:65-77`
- **Data Stored:** Active sessions, completed sessions, participant mappings, budgets, memory, consensus, timeline
- **Persistence:** `debate-session-persistence.ts` writes to both Dexie and localStorage
- **Source of Truth:** DebateService for legacy; DebateEngine for new runtime (feature flag `debate.runtimeEngine`)
- **Risk:** TWO parallel debate systems with overlapping state. Migration incomplete.

### S22: Tool Executor
- **Storage Type:** In-memory only
- **File:** `src/kernel/services/tool-executor.ts:80-81`
- **Data Stored:** executionHistory, rateLimitCounters
- **Source of Truth:** YES for tool execution tracking
- **Risk:** Lost on page reload.

### S23: Workspace Service
- **Storage Type:** File System Access API + Dexie persistence
- **File:** `src/kernel/services/workspace-service.ts:29-370`
- **Data Stored:** Directory handle, file tree, read history
- **Persistence:** Handle stored in `dexieDb.keyValue` under `workspace_handle`
- **Source of Truth:** YES for local file browsing

### S24: Blackboard Service
- **Storage Type:** In-memory only
- **File:** `src/kernel/services/blackboard-service.ts:21-23`
- **Data Stored:** Map of entries with TTL + 30s eviction timer
- **Source of Truth:** YES for inter-agent communication
- **Risk:** All entries lost on page reload.

### S25: Session Affinity
- **Storage Type:** In-memory only
- **File:** `src/kernel/services/session-affinity-store.ts:10`
- **Data Stored:** Session→key bindings with TTL
- **Source of Truth:** YES for session routing
- **Risk:** Lost on page reload. Sessions may route to wrong keys.

### S26: Health Service
- **Storage Type:** In-memory only
- **File:** `src/kernel/services/health-service.ts:20-27`
- **Data Stored:** Per-key health check results, last run timestamp
- **Source of Truth:** YES for health check results
- **Risk:** Lost on page reload. Overlaps with KeyStateStore.

### S27: PersonaService
- **Storage Type:** In-memory + StorageAdapter (localStorage)
- **File:** `src/kernel/services/persona-service.ts:134`
- **Data Stored:** Map of personas, active persona ID, active tone
- **Persistence:** StorageAdapter namespace `personas`
- **Source of Truth:** YES for persona management
- **Risk:** Uses localStorage while all other kernel services use Dexie/SQLite. Inconsistent.

### S28: Agent Journal Service
- **Storage Type:** In-memory cache + localStorage
- **File:** `src/kernel/services/agent-journal-service.ts:61-63`
- **Data Stored:** Journal entries, cache
- **Persistence:** localStorage key `agent_journal_v1`
- **Source of Truth:** YES for agent journal

### S29: Chat Bookmarks Service
- **Storage Type:** In-memory cache + localStorage
- **File:** `src/kernel/services/chat-bookmarks-service.ts:60`
- **Data Stored:** Chat bookmarks, cache
- **Persistence:** localStorage key `chat_bookmarks_v1`
- **Source of Truth:** YES for bookmarks

### S30: Config Registry (Static)
- **Storage Type:** Frozen module-level object
- **File:** `src/kernel/services/config-registry.ts:3-275`
- **Data Stored:** router, monitoring, metrics, traces, webhooks, keys, llm, pressure, pricing, services config sections
- **Source of Truth:** YES for default configuration values
- **Risk:** User overrides stored separately (ConfigService overlays + RouterConfigManager). Can diverge.

---

# 2. Global Memory Flow Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER STORAGE                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  IndexedDB    │  │  localStorage │  │  sessionStorage     │  │
│  │  (Dexie v4)   │  │  (raw)        │  │  (vault_salt only)  │  │
│  │               │  │               │  │                      │  │
│  │  • SQLite blob│  │  • 32 service │  │                      │  │
│  │  • memories   │  │    namespaces │  │                      │  │
│  │  • connectors │  │  • 15 legacy  │  │                      │  │
│  │  • workspace  │  │    keys       │  │                      │  │
│  │  • notes      │  │  • locale     │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
│         │                  │                                     │
└─────────┼──────────────────┼─────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                             │
│                                                                 │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  SqliteStorage  │  │ StorageAdapter│  │  DexieStorage    │   │
│  │  (9 tables)     │  │ (32 ns)      │  │  (8 tables)      │   │
│  │                 │  │              │  │                  │   │
│  │  persistSqliteDb│  │ get/set/del  │  │  CRUD per table  │   │
│  │  every 15s      │  │ every call   │  │  every call      │   │
│  └────────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│           │                  │                    │              │
└───────────┼──────────────────┼────────────────────┼──────────────┘
            │                  │                    │
            ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    KERNEL SERVICES                               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  KeyRegistry  │  │ MemoryEngine │  │  ChatService         │  │
│  │  KeyStateStore│  │ DebateService│  │  RoleService         │  │
│  │  KeyHealth    │  │ CognitiveSvc │  │  SkillService        │  │
│  │  ProviderTrack│  │ SettingsSvc  │  │  ConfigService       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │              │
│         ▼                  ▼                      ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    EVENT BUS                              │   │
│  │  listenerMap, validatorMap, strictMode                    │   │
│  │  ~130 event types, ~85 raw string replacements           │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UI LAYER                                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Zustand (2)  │  │ Custom Hooks │  │  Context (2)         │  │
│  │  • debateLive │  │ • useKeyStore│  │  • AgentsPanel       │  │
│  │  • topoTrace  │  │ • useChatStore│ │  • I18n              │  │
│  │              │  │ • useSystem  │  │                      │  │
│  │  (no persist)│  │ (SQLite/Dexie)│ │  (no persist)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ~789 useState, ~190 useRef, ~160 useEffect                     │
│  ~24 useMemo, ~114 useCallback, 0 useReducer                    │
│  6 React.memo wrappers, 1 useSyncExternalStore                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: API Keys

```
User Input → AddKeyModal → useKeyStore.addKey()
  → groupManager.createKey()
    → KeyRegistry.addKey()
      → SQLite api_keys table
      → EventBus.emit('key:added')
  → useKeyStore receives KEYS_LOADED event
    → Updates module-level store
    → React re-renders via useSyncExternalStore
  → KeyStateStore.ingestProbe()
    → Updates routing weights
```

### Data Flow: Chat Messages

```
User Input → ChatPanel → useChatStore.sendMessage()
  → EventBus.emit('chat:send')
  → ChatService processes
    → LLMClient via decorated adapter chain
  → EventBus.emit('chat:stream:chunk') (multiple)
  → useChatStore receives STREAM_CHUNK events
    → Appends to sessions[].history
  → EventBus.emit('chat:stream:end')
    → useChatStore receives STREAM_END
    → MemoryEngine.store() (if autoStore enabled)
      → Dexie memories table
      → Web Worker for semantic search
    → MessageIndexService.indexMessage()
      → localStorage message_index_v1
```

### Data Flow: Debate Session

```
User Input → DebatePanel → debateService.startDebate()
  → DebateEngine (if feature flag ON) OR DebateService (legacy)
  → For each round:
    → debateLLMCaller.callLLM()
      → AdapterRegistry.getAdapter()
        → Decorated adapter chain (CB → RL → PQ → Cache → LLM)
    → EventBus.emit('debate-runtime:agent:responded')
  → useDebateLiveStore receives events
    → Updates agentEvents, roundEvents
  → On completion:
    → persistSessionToDatabase() → Dexie debate store
    → DebateInterpreter computes metrics
```

---

# 3. Duplicate State Report

## 3.1 Critical Duplicates

### D1: Router Configuration (3 copies)
| Copy | Location | Data |
|------|----------|------|
| **A** | `CONFIG.router` (config-registry.ts:7-83) | Default weights, scoring, classification |
| **B** | `ConfigService.overlays.router` (config-service.ts:56) | User overrides, persisted to `config_overlays` |
| **C** | `RouterConfigManager` (router-config-manager.ts:58) | Profiles, active profile, A/B test, persisted to `router_config` |

**Risk:** HIGH — All three can diverge. ConfigService calls `setConfig()` to merge into A, but C has its own DB load. User changes via Settings panel go through B, changes via Weight Tuner go through C.

### D2: Circuit Breaker State (3 copies)
| Copy | Location | Data |
|------|----------|------|
| **A** | `CircuitBreakerDecorator.state` (circuit-breaker.ts:33) | Per-adapter live state |
| **B** | `CrossTabStateSync.localCircuitBreakers` (cross-tab-state.ts:50) | Cross-tab mirror |
| **C** | `KeyStateStore.flags.circuitOpen` (key-state-store.ts) | Per-key summary flag |

**Risk:** MEDIUM — A is authoritative. B is event-sourced from A. C is derived from events. Timing mismatches possible.

### D3: Health Data (3 copies)
| Copy | Location | Data |
|------|----------|------|
| **A** | `HealthService.results` (health-service.ts:21) | Per-key health check results |
| **B** | `KeyStateStore.states[key].healthScore` (key-state-store.ts:14) | Per-key health score |
| **C** | `ProviderTracker.healthEvents` (provider-tracker.ts:42) | Provider-level health events |

**Risk:** MEDIUM — Different granularity (key vs provider). Could conflict if one is stale.

### D4: SLA Mode (3 copies)
| Copy | Location | Data |
|------|----------|------|
| **A** | `SettingsService.settings.slaMode` (settings-service.ts:119) | User preference, persisted |
| **B** | `SystemKernel.state.activeSLA` (kernel.ts:110) | Runtime state, event-driven |
| **C** | `CONFIG.keys.slaProfiles` (config-registry.ts:146) | Static profile definitions |

**Risk:** LOW — Flow is A → B (via `applySettings`). C is read-only reference. But A and B can diverge if kernel state is modified directly.

### D5: Fallback Chains (2 copies)
| Copy | Location | Data |
|------|----------|------|
| **A** | `SettingsService.settings.fallbackChains` (settings-service.ts) | User-configured chains |
| **B** | `RoutingPolicyService.fallbackChains` (routing-policy-service.ts:35) | Loaded from CONFIG.router |

**Risk:** LOW — B reads from CONFIG, A reads from DB. Changes via Settings should update both.

### D6: Pricing Tables (2 copies)
| Copy | Location | Data |
|------|----------|------|
| **A** | `CONFIG.llm.pricing` (config-registry.ts:161-169) | Per-model LLM pricing |
| **B** | `CONFIG.pricing.fallbackPricing` (config-registry.ts:184-209) | Broader fallback pricing |

**Risk:** LOW — Overlapping model entries with same values. A is primary, B is fallback.

### D7: Debate Session State (2 systems)
| Copy | Location | Data |
|------|----------|------|
| **A** | `DebateService.activeSession` (debate-service.ts:37) | Legacy debate system |
| **B** | `DebateEngine.sessions` (debate-engine.ts:65) | New runtime (behind feature flag) |

**Risk:** MEDIUM — Two parallel systems. Feature flag `debate.runtimeEngine` controls which is active. Migration incomplete.

### D8: Debate Session Persistence (3 locations)
| Copy | Location | Data |
|------|----------|------|
| **A** | Dexie `debate_sessions` table | SQLite-backed debate snapshots |
| **B** | localStorage `super_agents_debate_session` | Current session backup |
| **C** | localStorage `super_agents_debate_history` | Legacy history |

**Risk:** LOW — Migration path exists but adds complexity.

## 3.2 Moderate Duplicates

### D9: Key State Tracking
- `KeyRegistry.keys[]` — full key objects
- `KeyStateStore.states Map` — per-key routing/health state
- `KeyHealth` maps (rateLimitHistory, retryCounts, backoffMap) — per-key health state
- `CrossTabStateSync` — cross-tab key state mirror

### D10: Provider Metrics
- `SystemKernel.state.providers` — runtime metrics
- `ProviderTracker` — health events + error counts
- `MetricsService.history` — time series
- `CacheDecorator.cache` — response cache with model info
- `CostManagerDecorator.records` — cost per request

### D11: Agent Configuration
- `topology-defaults.ts` — hardcoded 22-node topology
- `OrchestrationService.activeTopology` — runtime topology
- `AgentService` — agent stats, groups, lifecycle
- `EloRatingService.profiles` — agent performance ratings

---

# 4. Source of Truth Report

## 4.1 Domain → Source of Truth

| Domain | Source of Truth | Competing Sources | Architectural Conflict |
|--------|----------------|-------------------|----------------------|
| **API Keys** | SQLite `api_keys` table | Dexie `apiKeys` (legacy fallback) | None — clean migration |
| **Chat Sessions** | SQLite `chat_sessions` via `useChatStore` → Dexie `sessions` | localStorage `super_agents_chat_sessions` (legacy) | Minor — legacy migration still active |
| **Memory** | Dexie `memories` table | Web Worker in-memory cache | None — worker is cache, Dexie is SOT |
| **Router Config** | `RouterConfigManager` (DB key `router_config`) | `ConfigService.overlays.router`, `CONFIG.router` | **CONFLICT** — 3 sources can diverge |
| **SLA Mode** | `SettingsService.settings.slaMode` | `SystemKernel.state.activeSLA` | Minor — A→B flow exists but can desync |
| **Circuit Breaker** | `CircuitBreakerDecorator.state` (per-adapter) | `CrossTabStateSync`, `KeyStateStore.flags` | Minor — event-sourced, timing possible |
| **Health** | `HealthService.results` | `KeyStateStore.healthScore`, `ProviderTracker.healthEvents` | Minor — different granularity |
| **Settings** | `SettingsService` (DB key `super_agents_os_settings`) | `CONFIG` (static defaults) | None — overlay pattern correct |
| **Feature Flags** | `FeatureFlagService` (in-memory) | None | None — ephemeral by design |
| **Debate** | `DebateService` (legacy) or `DebateEngine` (new) | Dual system | **CONFLICT** — incomplete migration |
| **Roles** | SQLite `roles` via `RoleService` | Dexie `roles` (legacy fallback) | None — clean migration |
| **Skills** | SQLite `skills` via `SkillService` | Dexie `skills` (legacy fallback) | None — clean migration |
| **Traces** | SQLite `cognitive_traces` via `TraceService` | Dexie `cognitiveTraces` (legacy fallback) | None — clean migration |
| **Config** | `CONFIG` (frozen module) + `ConfigService.overlays` (DB) | `ConfigHistoryService` (in-memory snapshots) | None — correct layering |
| **Pricing** | `CONFIG.llm.pricing` (primary) + `CONFIG.pricing.fallbackPricing` | `CostManagerDecorator.records` (runtime) | None — separate concerns |
| **Personas** | `PersonaService` (StorageAdapter → localStorage) | None | **INCONSISTENCY** — uses localStorage while kernel uses SQLite |
| **Bookmarks** | `ChatBookmarksService` (localStorage) | None | **INCONSISTENCY** — not in SQLite |
| **Journal** | `AgentJournalService` (localStorage) | None | **INCONSISTENCY** — not in SQLite |
| **Connectors** | Dexie `connectors` table | None | None |
| **Workspace** | File System Access API + Dexie handle | None | None |
| **Metrics** | `MetricsService` (IndexedDB) | None | None |
| **Logs** | `LoggerService` ring buffer (in-memory) | None | None — lost on reload |
| **Events** | `EventRecorder` + `ReplayEngine` (in-memory) | None | None — lost on reload |
| **Blackboard** | `BlackboardService` (in-memory) | None | None — lost on reload |
| **Session Affinity** | `SessionAffinityStore` (in-memory) | None | None — lost on reload |
| **Agent Schedules** | `SchedulerService` (StorageAdapter → localStorage) | None | **INCONSISTENCY** — not in SQLite |
| **Research Data** | Multiple research services (StorageAdapter → localStorage) | None | **INCONSISTENCY** — not in SQLite |

---

# 5. Storage Consolidation Opportunities

## 5.1 High Priority (Architectural Conflicts)

### H1: Unify Router Configuration
**Current:** 3 sources (CONFIG.router, ConfigService.overlays.router, RouterConfigManager).
**Opportunity:** Make RouterConfigManager the single source of truth. CONFIG.router provides defaults only. ConfigService overlays should be removed or merged into RouterConfigManager on init.
**Impact:** Eliminates config drift. Simplifies settings UI.

### H2: Complete Debate System Migration
**Current:** Two parallel systems (DebateService legacy + DebateEngine new) behind feature flag.
**Opportunity:** Finish migration to DebateEngine. Remove DebateService. Unify persistence layer.
**Impact:** Eliminates dual debate state, reduces code by ~500 lines.

### H3: Consolidate Health Data
**Current:** 3 overlapping health data stores (HealthService, KeyStateStore, ProviderTracker).
**Opportunity:** KeyStateStore should be the single source. HealthService reads from it. ProviderTracker emits events that update KeyStateStore.
**Impact:** Eliminates health data conflicts.

## 5.2 Medium Priority (Consistency)

### M1: Migrate localStorage Services to SQLite
**Current:** 32 services use StorageAdapter (localStorage), 15+ use raw localStorage.
**Candidates for SQLite migration:**
- PersonaService → SQLite `config` store
- ChatBookmarksService → SQLite `chat_sessions` or new table
- AgentJournalService → new SQLite `agent_journal` table
- SchedulerService → SQLite `config` store
- Research services → SQLite `config` store

**Impact:** Unified persistence, cross-tab consistency, no 5MB limit.

### M2: Eliminate Raw localStorage Usage
**Current:** 15+ direct localStorage calls without prefix protection.
**Opportunity:** Route all through StorageAdapter or migrate to SQLite.
**Impact:** Namespace collision protection, consistent API.

### M3: Remove Legacy Migration Code
**Current:** 9 migration paths from localStorage to SQLite/Dexie.
**Opportunity:** After sufficient production time, remove migration code.
**Impact:** Reduced code complexity.

## 5.3 Low Priority (Optimization)

### L1: Unify Cache Layers
**Current:** CacheService (app-level), CacheDecorator (LLM-level), Gemini ModelCache (provider-level), LLMFlyweightConfig (dedup).
**Opportunity:** Consider if all are needed. CacheDecorator and CacheService serve different purposes (LLM response vs application data). Keep separate but document boundaries.

### L2: Reduce Event Bus Strict Mode Noise
**Current:** ~130 event types, many with Zod validation. Some validation failures block events.
**Opportunity:** Audit all validators. Remove overly strict ones. Add `.catch()` for non-critical events.
**Impact:** Fewer false-positive blocking events.

### L3: Consolidate Ring Buffers
**Current:** LoggerService (500), EventRecorder (10,000), SystemKernel.eventLog (10,000), MetricsService (CONFIG.maxEntries).
**Opportunity:** Consider shared buffer infrastructure.
**Impact:** Minor memory savings.

---

# Appendix A: All localStorage Keys

| Key | File | Purpose | Current? |
|-----|------|---------|----------|
| `super_agents_api_keys` | useKeyStore.ts:24, key-registry.ts:119 | Legacy key recovery | Legacy |
| `super_agents_os_memory` | memory-engine.ts:159 | Legacy memory migration | Legacy |
| `super_agents_roles` | role-service.ts:305 | Legacy role migration | Legacy |
| `super_agents_skills` | skill-service.ts:46 | Legacy skill migration | Legacy |
| `super_agents_chat_sessions` | useChatStore.ts:111 | Legacy session migration | Legacy |
| `super_agents_sqlite_db` | sqlite-storage.ts:1040 | Legacy SQLite blob | Legacy |
| `sqlite_persist_ts` | sqlite-storage.ts:1096 | Cross-tab sync signal | Current |
| `agent_journal_v1` | agent-journal-service.ts:37 | Agent journal entries | Current |
| `chat_bookmarks_v1` | chat-bookmarks-service.ts:34 | Chat bookmarks | Current |
| `locale` | I18nProvider.tsx:15 | UI language | Current |
| `hypothesis_votes` | HypothesisMarketplace.tsx:49 | Hypothesis votes | Current |
| `recent_files` | ProjectOsExplorer.tsx:108 | Recent files list | Current |
| `decision_log_v1` | DecisionLogPanel.tsx:30 | Decision log | Current |
| `message_index_v1` | message-index-service.ts:41 | Message search index | Current |
| `events_timeline_v1` | EventsTimeline.tsx:39 | Event history | Current |
| `superagents_prompt_overrides` | prompt-store.ts:19 | Prompt overrides | Current |
| `active_user_id` | security.ts:41 | Active user tracking | Current |
| `vault_salt_{userId}` | security.ts:116,228 | Encryption salt | Current |
| `provider-state-sync:*` | cross-tab-state.ts:178 | BroadcastChannel fallback | Current |
| 32 `superagents:*` keys | StorageAdapter (32 services) | Per-service data | Current |

# Appendix B: All DB Keys (Dexie keyValue)

| Key | File | Purpose | Current? |
|-----|------|---------|----------|
| `sqlite_db_blob` | sqlite-storage.ts:921 | SQLite database blob | Current |
| `config_overlays` | config-service.ts | User config overrides | Current |
| `router_config` | router-config-manager.ts | Router profiles/weights | Current |
| `super_agents_kernel_state` | kernel.ts:7 | System kernel state | Current |
| `super_agents_os_settings` | settings-service.ts:118 | User settings | Current |
| `super_agents_settings_profiles` | settings-service.ts | Settings profiles | Current |
| `provider_tracker_health_events` | provider-tracker.ts | Health event history | Current |
| `provider_tracker_metrics` | provider-tracker.ts | Provider metrics | Current |
| `super_agents_llm_cache` | cache-service.ts | Application cache | Current |
| `super_agents_metrics_history` | metrics-service.ts | Metrics time series | Current |
| `workspace_handle` | workspace-service.ts:171 | File system handle | Current |
| `latency_threshold` | key-service.ts:753 | Key latency threshold | Current |
| `role_usage_stats` | role-service.ts:346 | Role usage statistics | Current |
| `connectors` (Dexie table) | ConnectorsPanel.tsx | Connector configs | Current |

# Appendix C: In-Memory Singletons (95+ total)

| Singleton | File | State Fields | Persisted? |
|-----------|------|-------------|------------|
| EventBus | event-bus.ts:147 | listenerMap, validatorMap, emitCount | No |
| SystemKernel | kernel.ts:14 | state, eventLog, eventLogCursor, eventSeq | Yes (10s) |
| Container | container.ts:14 | services, factories, dependencies | No |
| AdapterRegistry | adapter-registry.ts:29 | adapters Map | No |
| AdapterFactory | adapter-factory.ts:40 | adapters, rateLimiters, circuitBreakers | No |
| KeyStateStore | key-state-store.ts:14 | states Map, listeners | No (rebuilt) |
| KeyRegistry | key-registry.ts:32 | keys Array | Yes (SQLite) |
| KeyHealth | key-health.ts:20 | rateLimitHistory, retryCounts, backoffMap | No |
| RouterService | provider-router.ts:93 | decisionHistory, config, latencyWindows | Partial |
| ProviderTracker | provider-tracker.ts:40 | healthEvents, prevStatuses | Yes (DB) |
| CacheService | cache-service.ts:14 | cache Map, hits, misses | Yes (IndexedDB) |
| LoggerService | logger-service.ts:92 | buffer Array (500) | No |
| MetricsService | metrics-service.ts:31 | history, alerts | Yes (IndexedDB) |
| CrossTabStateSync | cross-tab-state.ts:293 | circuitBreakers, rateLimits, errors | BroadcastChannel |
| FeatureFlagService | feature-flag-service.ts:6 | flags Record | No |
| SettingsService | settings-service.ts:119 | settings, profiles | Yes (DB) |
| DebateService | debate-service.ts:37 | activeSession, completedSessions | Partial |
| DebateEngine | debate-engine.ts:65 | sessions Map, budgets, memory | No |
| PersonaService | persona-service.ts:134 | personas Map | Yes (localStorage) |
| BlackboardService | blackboard-service.ts:21 | entries Map | No |
| SessionAffinityStore | session-affinity-store.ts:10 | bindings Map | No |
| HealthService | health-service.ts:21 | results Map | No |
| MessageIndexService | message-index-service.ts:56 | messages Array (5,000) | Yes (localStorage) |
| ToolExecutor | tool-executor.ts:80 | executionHistory, rateLimitCounters | No |
| WorkspaceService | workspace-service.ts:35 | readHistory | Partial (Dexie) |
| ToolService | tool-executor.ts:80 | executionHistory, rateLimitCounters | No |
| ConfigService | config-service.ts:54 | overlays | Yes (DB) |
| ConfigHistoryService | config-history.ts:26 | history Array | No |
| RouterConfigManager | router-config-manager.ts:58 | profiles, activeProfile, abTest | Yes (DB) |
| OrchestrationService | orchestration-service.ts:37 | activeTopology, disabledNodes, executionStats | No |
| ExecutionQueue | execution-queue.ts:17 | queues (5-level), inFlight | No |
| ProxyHealthMonitor | proxy-health-monitor.ts:38 | status Map, timers | No |
| FactCheckService | fact-check-service.ts:52 | cache Map, argumentResults | No |
| ResumableStream | resumable-stream.ts:385 | streams Map, chunkBuffer | No |
| LLMFlyweightConfig | flyweight.ts:4 | pool Map, timestamps | No |
| GeminiModelCache | gemini-model-validator.ts:113 | cache Map, fetchPromises | No |
| globalTaskQueue | TaskQueue.ts:156 | queue Array, counters | No |
| storage | storage.ts:337 | drivers Map | No |
| dexieDb | database-service.ts:132 | Dexie instance | N/A |
| db | database-service.ts:215 | DatabaseService | N/A |
| securityService | security.ts:244 | vault state | Partial |
| runtime | runtime.ts:139 | RuntimeManager | No |
| agentAutoTriggerService | agent-auto-trigger-service.ts:287 | rules, history Maps | Partial (localStorage) |

---

*End of audit. TypeScript compiles clean. No code modifications made.*
