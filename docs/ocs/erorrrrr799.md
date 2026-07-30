react-dom_client.js?v=798e8e37:14338 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
logger-service.ts:140 [12:06:34.297] INFO [DatabaseService] No clean shutdown flag — possible crash, running integrity scan
logger-service.ts:140 [12:06:34.304] INFO [DatabaseService] Migration v5→v6: table 'keyValue' indexes changed: [id] → [id, createdAt]
logger-service.ts:140 [12:06:34.304] INFO [DatabaseService] Migration v10→v11: table 'debateSessions' indexes changed: [id, phase, updatedAt] → [id, phase, updatedAt, topic, folder, isArchived]
logger-service.ts:140 [12:06:34.308] INFO [DatabaseService] Integrity auto-scan started {intervalMs=1800000}
logger-service.ts:140 [12:06:34.309] INFO [Runtime] Storage initialized {hasStorageLayer=true, hasKeys=true, keysType=object, hasListKeys=true, storageBackend=dexie}
logger-service.ts:140 [12:06:34.309] INFO [Bootstrap] Initializing Super-Agents OS Runtime...
logger-service.ts:140 [12:06:34.310] INFO [Phase0EventBridge] EventBridge initialized
phase1-foundation.ts:55 [KEY_FLOW] keyStore implementation type: {storageLayerExists: true, keyStoreExists: true, isStub: false, hasListKeys: true, hasBulkPut: true}
logger-service.ts:140 [12:06:34.312] INFO [ExperimentEngine] init {count=0}
logger-service.ts:137 [12:06:34.328] WARN [CompromiseWebhook] Webhook secret not configured — compromise detection is DISABLED. Set CONFIG.security.webhookSecret to enable.
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ compromise-webhook-service.ts:15
Promise.then
(anonymous) @ compromise-webhook-service.ts:13
logger-service.ts:140 [12:06:34.409] INFO [DexieIdentity] [DEXIE_ANCHOR] first anchor set {source=database-service:singleton, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=18}
logger-service.ts:140 [12:06:34.453] INFO [KeyMigration] Migration already completed — skipping
logger-service.ts:140 [12:06:34.463] INFO [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=bootstrap:step3, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=18, timestamp=1785413194463}
logger-service.ts:140 [12:06:34.469] INFO [Bootstrap] Snapshot repo count {count=18}
bootstrap-key-init.ts:133 [BOOTSTRAP_SNAPSHOT_FINAL] count: 18
bootstrap-key-init.ts:134 [BOOTSTRAP_SNAPSHOT_SOURCE] keystore
logger-service.ts:140 [12:06:34.499] INFO [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=key-storage-hydrator:start, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=18, timestamp=1785413194499}
logger-service.ts:140 [12:06:34.507] INFO [KeyStorageHydrator] dexieKeys.length = 18 from instance [object Object]
key-registry.ts:179 [KEY_REGISTRY_OVERWRITE] {source: 'reload:enter', seq: 1, prevCount: 0, nextCount: 0, force: false}
(anonymous) @ key-registry.ts:179
(anonymous) @ key-service.ts:419
(anonymous) @ key-storage-hydrator.ts:54
await in (anonymous)
(anonymous) @ key-storage-hydrator.ts:70
(anonymous) @ bootstrap-key-init.ts:36
await in (anonymous)
(anonymous) @ bootstrap.ts:123
await in (anonymous)
(anonymous) @ runtime.ts:78
(anonymous) @ runtime.ts:104
(anonymous) @ main.tsx:87
logger-service.ts:140 [12:06:34.514] INFO [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=KeyRegistry.forceResyncFromDexie, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=18, timestamp=1785413194514}
logger-service.ts:140 [12:06:34.685] INFO [DatabaseService] Startup integrity scan: all tables clean
logger-service.ts:140 [12:06:34.686] INFO [KeyRegistry] [KEY_TRACE] loadDexie: 0 -> 18 {sample=[{"id":"049ba4a7-303d-4378-9845-1895681e9f29","provider":"gemini","hasKey":true,"keyLen":162,"isEncrypted":false},{"id":"12f61e6f-d9ed-4d09-9d86-830276b73817","provider":"nvidia","hasKey":true,"keyLen…, source=repo.getAll()}
logger-service.ts:140 [12:06:34.687] INFO [KeyRegistry] [KEY_TRACE] normalize.map: 18 -> 18 {sample=[{"id":"049ba4a7-303d-4378-9845-1895681e9f29","provider":"gemini","hasKey":true,"keyLen":162,"isEncrypted":false},{"id":"12f61e6f-d9ed-4d09-9d86-830276b73817","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [12:06:34.687] INFO [KeyRegistry] [KEY_TRACE] filterValid: 18 -> 18 {sample=[{"id":"049ba4a7-303d-4378-9845-1895681e9f29","provider":"gemini","hasKey":true,"keyLen":162,"isEncrypted":false},{"id":"12f61e6f-d9ed-4d09-9d86-830276b73817","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [12:06:34.687] INFO [KeyRegistry] [KEY_TRACE] assign: 0 -> 18 {sample=[{"id":"049ba4a7-303d-4378-9845-1895681e9f29","provider":"gemini","hasKey":true,"keyLen":162,"isEncrypted":false},{"id":"12f61e6f-d9ed-4d09-9d86-830276b73817","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [12:06:35.154] INFO [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=KeyRegistry.loadKeys, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=18, timestamp=1785413195154}
logger-service.ts:140 [12:06:35.154] INFO [KeyRegistry] using bootstrap snapshot ONLY, count: 18
logger-service.ts:140 [12:06:35.154] INFO [KeyRegistry] [KEY_TRACE] bootstrap.normalize.map: 18 -> 18 {sample=[{"id":"049ba4a7-303d-4378-9845-1895681e9f29","provider":"gemini","hasKey":true,"keyLen":162,"isEncrypted":false},{"id":"12f61e6f-d9ed-4d09-9d86-830276b73817","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [12:06:35.154] INFO [KeyRegistry] [KEY_TRACE] bootstrap.filterValid: 18 -> 18 {sample=[{"id":"049ba4a7-303d-4378-9845-1895681e9f29","provider":"gemini","hasKey":true,"keyLen":162,"isEncrypted":false},{"id":"12f61e6f-d9ed-4d09-9d86-830276b73817","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [12:06:35.156] INFO [KeyRegistry] [KEY_TRACE] bootstrap.decrypt: 18 -> 18 {sample=[{"id":"049ba4a7-303d-4378-9845-1895681e9f29","provider":"gemini","hasKey":true,"keyLen":53,"isEncrypted":false},{"id":"12f61e6f-d9ed-4d09-9d86-830276b73817","provider":"nvidia","hasKey":true,"keyLen"…}
logger-service.ts:140 [12:06:35.157] INFO [KeyRegistry] [KEY_TRACE] bootstrap.assign: 18 -> 18 {sample=[{"id":"049ba4a7-303d-4378-9845-1895681e9f29","provider":"gemini","hasKey":true,"keyLen":53,"isEncrypted":false},{"id":"12f61e6f-d9ed-4d09-9d86-830276b73817","provider":"nvidia","hasKey":true,"keyLen"…}
logger-service.ts:140 [12:06:35.159] INFO [KeyLifecycle] Counters restored from DB {errorCount=3, successCount=14}
logger-service.ts:140 [12:06:35.395] INFO [SchedulerService] Scheduler started
logger-service.ts:140 [12:06:35.395] INFO [SchedulerService] Initialized with 0 schedules
logger-service.ts:140 [12:06:35.395] INFO [Orchestrator] Mounted topology: Agent Workforce (v2.0.0)
logger-service.ts:140 [12:06:35.705] INFO [Bootstrap] Group Manager synced existing keys
logger-service.ts:140 [12:06:35.707] INFO [Bootstrap] KeyStateStore seeded with 18 key(s)
logger-service.ts:140 [12:06:35.860] INFO [Bootstrap] DebateService initialized
logger-service.ts:140 [12:06:35.861] INFO [Bootstrap] MemoryWatchdog pressure callbacks registered
logger-service.ts:140 [12:06:35.997] INFO [CrossTabStateSync] Initialized with BroadcastChannel {tabId=ms7gx1kf-fc75fd39-231b-4925-a2a8-e42dadf5969d}
main.tsx:39 [Memory] heap: 71.3MB / 202.9MB
logger-service.ts:140 [12:07:24.764] INFO [DebateSyncManager] Starting debate {topic=массового получения воды из воздуха в прибрежной зоне города Ашдода, participants=10, strategy=round_robin, maxRounds=2}
logger-service.ts:134 [12:07:25.558] ERROR [DebateSyncManager] Failed to update session meta with linkedDebateId {error=Session default not found}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:101
(anonymous) @ debate-sync-manager.ts:405
Promise.catch
(anonymous) @ debate-sync-manager.ts:404
(anonymous) @ debate-sync-manager.ts:261
(anonymous) @ DebatePanel.tsx:455
executeDispatch @ react-dom_client.js?v=798e8e37:9141
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
processDispatchQueue @ react-dom_client.js?v=798e8e37:9167
(anonymous) @ react-dom_client.js?v=798e8e37:9454
batchedUpdates$1 @ react-dom_client.js?v=798e8e37:2044
dispatchEventForPluginEventSystem @ react-dom_client.js?v=798e8e37:9240
dispatchEvent @ react-dom_client.js?v=798e8e37:11319
dispatchDiscreteEvent @ react-dom_client.js?v=798e8e37:11301
<button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ ReviewStep.tsx:258
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performWorkOnRootViaSchedulerTask @ react-dom_client.js?v=798e8e37:9059
performWorkUntilDeadline @ react-dom_client.js?v=798e8e37:36
<ReviewStep>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ DebateSetupWizard.tsx:158
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performSyncWorkOnRoot @ react-dom_client.js?v=798e8e37:9067
flushSyncWorkAcrossRoots_impl @ react-dom_client.js?v=798e8e37:8984
processRootScheduleInMicrotask @ react-dom_client.js?v=798e8e37:9005
(anonymous) @ react-dom_client.js?v=798e8e37:9078
llm-http-client.ts:191  POST http://localhost:5173/proxy/openrouter/api/v1/chat/completions 402 (Payment Required)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ openrouter-adapter.ts:177
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-engine.ts:354
(anonymous) @ debate-engine.ts:419
(anonymous) @ debate-engine.ts:800
(anonymous) @ debate-pipeline-builder.ts:91
(anonymous) @ debate-pipeline.ts:23
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ DebatePanel.tsx:455
executeDispatch @ react-dom_client.js?v=798e8e37:9141
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
processDispatchQueue @ react-dom_client.js?v=798e8e37:9167
(anonymous) @ react-dom_client.js?v=798e8e37:9454
batchedUpdates$1 @ react-dom_client.js?v=798e8e37:2044
dispatchEventForPluginEventSystem @ react-dom_client.js?v=798e8e37:9240
dispatchEvent @ react-dom_client.js?v=798e8e37:11319
dispatchDiscreteEvent @ react-dom_client.js?v=798e8e37:11301
<button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ ReviewStep.tsx:258
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performWorkOnRootViaSchedulerTask @ react-dom_client.js?v=798e8e37:9059
performWorkUntilDeadline @ react-dom_client.js?v=798e8e37:36
<ReviewStep>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ DebateSetupWizard.tsx:158
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performSyncWorkOnRoot @ react-dom_client.js?v=798e8e37:9067
flushSyncWorkAcrossRoots_impl @ react-dom_client.js?v=798e8e37:8984
processRootScheduleInMicrotask @ react-dom_client.js?v=798e8e37:9005
(anonymous) @ react-dom_client.js?v=798e8e37:9078
logger.ts:20 [2026-07-30T12:07:26.229Z] ERROR [LoggingDecorator] openrouter[rl][cb][pq][cost] meta-llama/llama-3.1-8b-instruct failed after 662ms {error: 'openrouter'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-engine.ts:354
(anonymous) @ debate-engine.ts:419
(anonymous) @ debate-engine.ts:800
(anonymous) @ debate-pipeline-builder.ts:91
(anonymous) @ debate-pipeline.ts:23
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ DebatePanel.tsx:455
executeDispatch @ react-dom_client.js?v=798e8e37:9141
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
processDispatchQueue @ react-dom_client.js?v=798e8e37:9167
(anonymous) @ react-dom_client.js?v=798e8e37:9454
batchedUpdates$1 @ react-dom_client.js?v=798e8e37:2044
dispatchEventForPluginEventSystem @ react-dom_client.js?v=798e8e37:9240
dispatchEvent @ react-dom_client.js?v=798e8e37:11319
dispatchDiscreteEvent @ react-dom_client.js?v=798e8e37:11301
<button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ ReviewStep.tsx:258
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performWorkOnRootViaSchedulerTask @ react-dom_client.js?v=798e8e37:9059
performWorkUntilDeadline @ react-dom_client.js?v=798e8e37:36
<ReviewStep>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ DebateSetupWizard.tsx:158
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performSyncWorkOnRoot @ react-dom_client.js?v=798e8e37:9067
flushSyncWorkAcrossRoots_impl @ react-dom_client.js?v=798e8e37:8984
processRootScheduleInMicrotask @ react-dom_client.js?v=798e8e37:9005
(anonymous) @ react-dom_client.js?v=798e8e37:9078
logger-service.ts:137 [12:07:26.230] WARN  [DebateEngine] preflight: openrouter/meta-llama/llama-3.1-8b-instruct auth error — marking provider failed
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-engine.ts:381
await in (anonymous)
(anonymous) @ debate-engine.ts:419
(anonymous) @ debate-engine.ts:800
(anonymous) @ debate-pipeline-builder.ts:91
(anonymous) @ debate-pipeline.ts:23
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ DebatePanel.tsx:455
executeDispatch @ react-dom_client.js?v=798e8e37:9141
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
processDispatchQueue @ react-dom_client.js?v=798e8e37:9167
(anonymous) @ react-dom_client.js?v=798e8e37:9454
batchedUpdates$1 @ react-dom_client.js?v=798e8e37:2044
dispatchEventForPluginEventSystem @ react-dom_client.js?v=798e8e37:9240
dispatchEvent @ react-dom_client.js?v=798e8e37:11319
dispatchDiscreteEvent @ react-dom_client.js?v=798e8e37:11301
<button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ ReviewStep.tsx:258
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performWorkOnRootViaSchedulerTask @ react-dom_client.js?v=798e8e37:9059
performWorkUntilDeadline @ react-dom_client.js?v=798e8e37:36
<ReviewStep>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ DebateSetupWizard.tsx:158
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performSyncWorkOnRoot @ react-dom_client.js?v=798e8e37:9067
flushSyncWorkAcrossRoots_impl @ react-dom_client.js?v=798e8e37:8984
processRootScheduleInMicrotask @ react-dom_client.js?v=798e8e37:9005
(anonymous) @ react-dom_client.js?v=798e8e37:9078
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"OK","thoughtSignature":"EjQKMgERTTIP/LI0edwuK5lLZ1JAkY7q60SSfADnmbTWKkXHowyISVnznWaDSJQu8yKIImO8"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":1,"totalTokenCount":6,"promptTokensDetails":[{"modality":"TEXT","tokenCount":5}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"fT5ratDMEZy9kdUPt9msqAg"}
(anonymous) @ gemini-adapter.ts:80
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-engine.ts:354
(anonymous) @ debate-engine.ts:419
(anonymous) @ debate-engine.ts:800
(anonymous) @ debate-pipeline-builder.ts:91
(anonymous) @ debate-pipeline.ts:23
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ DebatePanel.tsx:455
executeDispatch @ react-dom_client.js?v=798e8e37:9141
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
processDispatchQueue @ react-dom_client.js?v=798e8e37:9167
(anonymous) @ react-dom_client.js?v=798e8e37:9454
batchedUpdates$1 @ react-dom_client.js?v=798e8e37:2044
dispatchEventForPluginEventSystem @ react-dom_client.js?v=798e8e37:9240
dispatchEvent @ react-dom_client.js?v=798e8e37:11319
dispatchDiscreteEvent @ react-dom_client.js?v=798e8e37:11301
<button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ ReviewStep.tsx:258
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performWorkOnRootViaSchedulerTask @ react-dom_client.js?v=798e8e37:9059
performWorkUntilDeadline @ react-dom_client.js?v=798e8e37:36
<ReviewStep>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=798e8e37:193
(anonymous) @ DebateSetupWizard.tsx:158
react_stack_bottom_frame @ react-dom_client.js?v=798e8e37:12868
renderWithHooksAgain @ react-dom_client.js?v=798e8e37:4268
renderWithHooks @ react-dom_client.js?v=798e8e37:4219
updateFunctionComponent @ react-dom_client.js?v=798e8e37:5569
beginWork @ react-dom_client.js?v=798e8e37:6140
runWithFiberInDEV @ react-dom_client.js?v=798e8e37:851
performUnitOfWork @ react-dom_client.js?v=798e8e37:8429
workLoopSync @ react-dom_client.js?v=798e8e37:8325
renderRootSync @ react-dom_client.js?v=798e8e37:8309
performWorkOnRoot @ react-dom_client.js?v=798e8e37:7957
performSyncWorkOnRoot @ react-dom_client.js?v=798e8e37:9067
flushSyncWorkAcrossRoots_impl @ react-dom_client.js?v=798e8e37:8984
processRootScheduleInMicrotask @ react-dom_client.js?v=798e8e37:9005
(anonymous) @ react-dom_client.js?v=798e8e37:9078
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"Вы правы в том, что Ашдод обладает высоким потенциалом влажности воздуха благодаря близости к Средиземному морю, что делает технологию атмосферной генерации воды (AWG) теоретически жизнеспособной. Однако это не отменяет того факта, что экономическая эффективность AWG в данном регионе упирается в «барьер энергоемкости»: стоимость получения кубометра воды из воздуха кратно превышает затраты на уже отлаженную инфраструктуру опреснения морской воды.\n\nРазве рационально инвестировать в масштабирование технологий с низким коэффициентом энергетической эффективности, когда рынок опреснения в Израиле уже достиг эффекта масштаба и технологической оптимизации? Вместо распыления капитала на энергозатратные распределенные системы, не целесообразнее ли направить ресурсы на интеграцию ВИЭ в существующие централизованные сети, чтобы снизить углеродный след уже имеющихся производственных мощностей?","thoughtSignature":"EjQKMgERTTIPpjIxi05TIXyLyhS/AQjFBBv5cu
(anonymous) @ gemini-adapter.ts:80
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"=== CRITIQUE ===\nВаш аргумент уязвимо игнорирует вопрос «критической устойчивости»: централизованные опреснительные системы — это единые точки отказа, крайне уязвимые для кибератак, техногенных аварий или военных угроз. В условиях климатической нестабильности распределенная генерация воды является не просто экономической альтернативой, а необходимым стратегическим резервом безопасности, ценность которого невозможно измерить лишь стоимостью кубометра.\n\n=== STRENGTHENED ===\nХотя экономическая эффективность AWG в Ашдоде действительно проигрывает масштабированному опреснению, ваш акцент исключительно на операционных затратах игнорирует критический фактор «системной надежности». В условиях геополитической турбулентности Израиля, ставка на гиперцентрализованную инфраструктуру создает неприемлемые риски: выход из строя одного опреснительного узла парализует снабжение целого региона. \n\nЯ не призываю к замене опреснения на AWG, но настаиваю на
(anonymous) @ gemini-adapter.ts:80
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-shadow-opponent-service.ts:77
(anonymous) @ debate-llm-caller.ts:2099
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
main.tsx:39 [Memory] heap: 105.2MB / 145.5MB
logger-service.ts:137 [12:07:37.924] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-data, provider=groq, model=llama-3.3-70b-versatile, keyId=2994de58, rejectCount=1, maxRejects=3, preview=Вы правы в том, что технология атмосферной генерации воды (AWG) сталкивается с проблемой «барьера энергоемкости», что мо}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:137 [12:07:39.678] WARN [DebateLlmCaller] Response rejected — entanglement validation {agentId=agent-data, reason=no_explicit_reference_to_opponent, low_term_overlap_with_target, targetAgent=Climate Scientist / Климатолог}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:2023
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:140 [12:07:39.680] INFO [DebateLlmCaller] PROVIDER SWITCH {from=groq, to=gemini, model=gemini-3.1-flash-lite, agentId=agent-data}
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"\n\nДай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что текущая экономическая модель водоснабжения Ашдода, опирающаяся на централизованное опреснение, является оптимальной из-за эффекта масштаба, а любые альтернативы вроде AWG — это нецелесообразная трата ресурсов, так как они проигрывают по энергоэффективности и требуют капиталовложений в заведомо проигрышную технологию. Я правильно тебя понял?\n\nВы правы в том, что в текущих условиях централизованное опреснение обладает преимуществом по удельной стоимости кубометра, однако это не отменяет того факта, что вы рассматриваете устойчивость системы исключительно через призму стоимости генерации, игнорируя стоимость рисков. \n\nКак проектный менеджер, я вижу критическую уязвимость: централизованная инфраструктура — это единая точка отказа, уязвимая для кибератак, технических аварий или геополитической дестабилизации. Разве разумно ставить стратегическую безопасн
(anonymous) @ gemini-adapter.ts:80
logger-service.ts:137 [12:07:59.637] WARN [PricingService] Unknown model "auto" — using fallback pricing
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ pricing-service.ts:158
(anonymous) @ pricing-service.ts:244
(anonymous) @ router-ranking.ts:512
(anonymous) @ router-scoring.ts:94
(anonymous) @ router-ranking.ts:511
(anonymous) @ provider-router.ts:407
(anonymous) @ insight-engine.ts:149
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
main.tsx:39 [Memory] heap: 126.2MB / 180.0MB
main.tsx:39 [Memory] heap: 149.1MB / 187.5MB
logger.ts:20 [2026-07-30T12:08:45.317Z] ERROR [LoggingDecorator] nvidia-nim[rl][cb][pq][cost] meta/llama-3.3-70b-instruct failed after 60034ms {error: 'nvidia-nim request timed out after 60000ms'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
logger-service.ts:137 [12:08:45.317] WARN [ExecutionGovernor] Operation op-ms7gykcj-6 failed {type=debate, error=nvidia-nim request timed out after 60000ms}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-shadow-opponent-service.ts:77
(anonymous) @ debate-llm-caller.ts:2099
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-shadow-opponent-service.ts:77
(anonymous) @ debate-llm-caller.ts:2099
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-shadow-opponent-service.ts:77
(anonymous) @ debate-llm-caller.ts:2099
logger.ts:20 [2026-07-30T12:09:01.486Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.3-70b-versatile failed after 2445ms {error: '429 {"error":{"message":"Rate limit reached for mo…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-shadow-opponent-service.ts:77
(anonymous) @ debate-llm-caller.ts:2099
logger-service.ts:137 [12:09:02.941] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-ethics, provider=groq, model=llama-3.3-70b-versatile, keyId=2994de58, rejectCount=1, maxRejects=3, preview=ше привести к значительным экономическим потерям в случае кибератаки, технической аварии или геополитической дестабилиза}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 413 (Content Too Large)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
logger.ts:20 [2026-07-30T12:09:03.918Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.1-8b-instant failed after 363ms {error: '413 {"error":{"message":"Request too large for mod…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:137 [12:09:03.919] WARN [ExecutionGovernor] Operation op-ms7h08qr-a failed {type=debate, error=413 {"error":{"message":"Request too large for model `llama-3.1-8b-instant` in organization `org_01krc00yf2fgrt97173kp900za` service tier `on_demand` on tokens per minute (TPM): Limit 6000, Requested …}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:140 [12:09:03.920] INFO [DebateLlmCaller] PROVIDER SWITCH {from=groq, to=gemini, model=gemini-3.1-flash-lite, agentId=agent-ethics}
main.tsx:39 [Memory] heap: 126.6MB / 225.3MB
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"\n\n---\n\nДай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что высокий уровень влажности в Ашдоде делает AWG теоретически жизнеспособной, но «барьер энергоемкости» делает её экономически проигрышной по сравнению с опреснением, поэтому инвестиции в децентрализацию нецелесообразны. Я правильно тебя понял?\n\nВы правы в том, что «барьер энергоемкости» существует в текущей точке технологического цикла, однако утверждение о том, что влажность в Ашдоде просто делает AWG «теоретически жизнеспособной», фундаментально ошибочно. Оно игнорирует критический экономический фактор: **прибрежная зона — это динамическая экосистема с высоким уровнем антропогенной нагрузки**, где сбросы рассола от опреснительных установок уже истощают биоразнообразие и подрывают экосистемные услуги, которые имеют прямую рыночную стоимость (от рыболовства до защиты побережья).\n\nРазве мы не совершаем экономическую ошибку, оценивая стоимость «к
(anonymous) @ gemini-adapter.ts:80
logger-service.ts:137 [12:09:07.439] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-ethics, provider=gemini, model=gemini-3.1-flash-lite, keyId=049ba4a7, rejectCount=2, maxRejects=3, preview= --- Дай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что высокий уровень влажности в}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
llm-http-client.ts:191 POST http://localhost:5173/proxy/gemini/v1beta/models/gemini-2.0-flash:generateContent 429 (Too Many Requests)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ gemini-adapter.ts:72
with429Retry @ gemini-adapter.ts:20
(anonymous) @ gemini-adapter.ts:71
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
llm-http-client.ts:191 POST http://localhost:5173/proxy/gemini/v1beta/models/gemini-2.0-flash:generateContent 429 (Too Many Requests)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ gemini-adapter.ts:72
with429Retry @ gemini-adapter.ts:20
await in with429Retry
(anonymous) @ gemini-adapter.ts:71
logger.ts:20 [2026-07-30T12:09:10.872Z] ERROR [LoggingDecorator] gemini[rl][cb][pq][cost] gemini-2.0-flash failed after 2840ms {error: 'Rate limited'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
logger-service.ts:137 [12:09:10.872] WARN [ExecutionGovernor] Operation op-ms7h0c74-c failed {type=debate, error=Rate limited}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
logger-service.ts:140 [12:09:10.874] INFO [DebateLlmCaller] PROVIDER SWITCH {from=gemini, to=nvidia, model=meta/llama-3.1-8b-instruct, agentId=agent-ethics}
logger-service.ts:137 [12:09:25.154] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-network, provider=groq, model=llama-3.3-70b-versatile, keyId=2994de58, rejectCount=1, maxRejects=3, preview=ше привести к значительным экономическим потерям в случае кибератаки, технической аварии или геополитической дестабилиза}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 413 (Content Too Large)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
logger.ts:20 [2026-07-30T12:09:26.095Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.1-8b-instant failed after 319ms {error: '413 {"error":{"message":"Request too large for mod…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:137 [12:09:26.096] WARN [ExecutionGovernor] Operation op-ms7h0pw0-f failed {type=debate, error=413 {"error":{"message":"Request too large for model `llama-3.1-8b-instant` in organization `org_01krc00yf2fgrt97173kp900za` service tier `on_demand` on tokens per minute (TPM): Limit 6000, Requested …}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:140 [12:09:26.097] INFO [DebateLlmCaller] PROVIDER SWITCH {from=groq, to=gemini, model=gemini-3.1-flash-lite, agentId=agent-network}
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"=== CRITIQUE ===\nТвой аргумент опирается на «скрытые издержки» экосистем, но ты полностью игнорируешь факт, что масштабирование AWG потребует установки тысяч энергоемких юнитов по всему побережью, что создаст тепловое загрязнение среды и выбросы хладагентов, по масштабам сопоставимые с экологическим следом опреснения. Ты пытаешься заменить одну экологическую проблему другой, не предоставляя доказательств того, что суммарный углеродный и тепловой след распределенной сети AWG будет ниже, чем у централизованного сброса рассола.\n\n=== STRENGTHENED ===\nВы абсолютно правы, что «барьер энергоемкости» — это лишь часть уравнения, но мой аргумент о децентрализации выходит за рамки простого выбора между двумя технологиями. Проблема опреснения не только в рассоле, но и в **критической уязвимости централизованной инфраструктуры** к антропогенным и природным рискам. Оценка стоимости «кубометра воды» в вакууме — это бухгалтерская ошибка, игнорирующая ст
(anonymous) @ gemini-adapter.ts:80
llm-http-client.ts:191 POST http://localhost:5173/proxy/gemini/v1beta/models/gemini-2.0-flash:generateContent 429 (Too Many Requests)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ gemini-adapter.ts:72
with429Retry @ gemini-adapter.ts:20
(anonymous) @ gemini-adapter.ts:71
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
llm-http-client.ts:191 POST http://localhost:5173/proxy/gemini/v1beta/models/gemini-2.0-flash:generateContent 429 (Too Many Requests)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ gemini-adapter.ts:72
with429Retry @ gemini-adapter.ts:20
logger.ts:20 [2026-07-30T12:09:34.123Z] ERROR [LoggingDecorator] gemini[rl][cb][pq][cost] gemini-2.0-flash failed after 2417ms {error: 'Rate limited'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
logger-service.ts:137 [12:09:34.123] WARN [ExecutionGovernor] Operation op-ms7h0ugp-h failed {type=debate, error=Rate limited}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
main.tsx:39 [Memory] heap: 115.0MB / 218.2MB
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"...\n\n---\n\nДай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что высокий уровень влажности в Ашдоде делает AWG теоретически жизнеспособной, но «барьер энергоемкости» делает её экономически проигрышной по сравнению с опреснением, поэтому инвестиции в децентрализа.\n\nЯ правильно тебя понял?\n\nВаш аргумент об «энергоемкости» — это классическая ловушка линейного мышления. Вы рассматриваете AWG как изолированный гаджет, конкурирующий с гигантской трубой, забывая, что экономическая эффективность любой системы определяется не только стоимостью производства ресурса, но и **стоимостью его доставки и потерь в сети**.\n\nАшдод, как и любой крупный город, несет колоссальные «невидимые» издержки на содержание и ремонт централизованных водоводов, а также на перекачку воды через сложный городской рельеф. Если мы децентрализуем производство воды, мы радикально сокращаем логистическое плечо и амортизационные расходы на ма
(anonymous) @ gemini-adapter.ts:80
logger-service.ts:137 [12:09:37.716] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-perf, provider=gemini, model=gemini-3.1-flash-lite, keyId=61a3d49b, rejectCount=1, maxRejects=3, preview=... --- Дай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что высокий уровень влажност}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
logger-service.ts:140 [12:09:37.717] INFO [DebateLlmCaller] PROVIDER SWITCH {from=gemini, to=groq, model=llama-3.3-70b-versatile, agentId=agent-perf}
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-shadow-opponent-service.ts:77
(anonymous) @ debate-llm-caller.ts:2099
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-shadow-opponent-service.ts:77
(anonymous) @ debate-llm-caller.ts:2099
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
logger.ts:20 [2026-07-30T12:09:40.499Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.3-70b-versatile failed after 1989ms {error: '429 {"error":{"message":"Rate limit reached for mo…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
logger-service.ts:137 [12:09:41.972] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-risk, provider=groq, model=llama-3.3-70b-versatile, keyId=2994de58, rejectCount=1, maxRejects=3, preview=ше привести к значительным экономическим потерям в случае кибератаки, технической аварии или геополитической дестабилиза}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 413 (Content Too Large)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger.ts:20 [2026-07-30T12:09:42.888Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.1-8b-instant failed after 280ms {error: '413 {"error":{"message":"Request too large for mod…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:137 [12:09:42.888] WARN [ExecutionGovernor] Operation op-ms7h12vk-l failed {type=debate, error=413 {"error":{"message":"Request too large for model `llama-3.1-8b-instant` in organization `org_01krc00yf2fgrt97173kp900za` service tier `on_demand` on tokens per minute (TPM): Limit 6000, Requested …}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:140 [12:09:42.890] INFO [DebateLlmCaller] PROVIDER SWITCH {from=groq, to=gemini, model=gemini-3.1-flash-lite, agentId=agent-risk}
logger-service.ts:137 [12:09:43.650] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-risk, provider=gemini, model=gemini-3.1-flash-lite, keyId=049ba4a7, rejectCount=2, maxRejects=3, preview= --- Дай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что высокий уровень влажности в}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
llm-http-client.ts:191 POST http://localhost:5173/proxy/gemini/v1beta/models/gemini-2.0-flash:generateContent net::ERR_ABORTED 429 (Too Many Requests)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ gemini-adapter.ts:72
with429Retry @ gemini-adapter.ts:20
(anonymous) @ gemini-adapter.ts:71
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
llm-http-client.ts:191 POST http://localhost:5173/proxy/gemini/v1beta/models/gemini-2.0-flash:generateContent 429 (Too Many Requests)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ gemini-adapter.ts:72
with429Retry @ gemini-adapter.ts:20
logger.ts:20 [2026-07-30T12:09:47.338Z] ERROR [LoggingDecorator] gemini[rl][cb][pq][cost] gemini-2.0-flash failed after 3025ms {error: 'Rate limited'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
logger-service.ts:137 [12:09:47.339] WARN [ExecutionGovernor] Operation op-ms7h146x-n failed {type=debate, error=Rate limited}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
logger-service.ts:140 [12:09:47.341] INFO [DebateLlmCaller] PROVIDER SWITCH {from=gemini, to=nvidia, model=meta/llama-3.1-8b-instruct, agentId=agent-risk}
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 413 (Content Too Large)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
logger.ts:20 [2026-07-30T12:09:50.176Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.1-8b-instant failed after 336ms {error: '413 {"error":{"message":"Request too large for mod…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:137 [12:09:50.176] WARN [ExecutionGovernor] Operation op-ms7h18gg-p failed {type=debate, error=413 {"error":{"message":"Request too large for model `llama-3.1-8b-instant` in organization `org_01ksfa472we598mxm5qasye8zb` service tier `on_demand` on tokens per minute (TPM): Limit 6000, Requested …}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:137 [12:09:52.757] WARN [DebateLlmCaller] Response rejected — entanglement validation {agentId=agent-security, reason=no_explicit_reference_to_opponent, low_term_overlap_with_target, targetAgent=Climate Scientist / Климатолог}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:2023
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:140 [12:09:52.759] INFO [DebateLlmCaller] PROVIDER SWITCH {from=groq, to=gemini, model=gemini-3.1-flash-lite, agentId=agent-security}
logger-service.ts:137 [12:09:58.479] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-architect, provider=gemini, model=gemini-3.1-flash-lite, keyId=049ba4a7, rejectCount=1, maxRejects=3, preview= --- Дай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что высокий уровень влажности в}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
llm-http-client.ts:191 POST http://localhost:5173/proxy/gemini/v1beta/models/gemini-2.0-flash:generateContent 429 (Too Many Requests)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ gemini-adapter.ts:72
with429Retry @ gemini-adapter.ts:20
(anonymous) @ gemini-adapter.ts:71
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
llm-http-client.ts:191 POST http://localhost:5173/proxy/gemini/v1beta/models/gemini-2.0-flash:generateContent 429 (Too Many Requests)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ gemini-adapter.ts:72
with429Retry @ gemini-adapter.ts:20
await in with429Retry
(anonymous) @ gemini-adapter.ts:71
logger.ts:20 [2026-07-30T12:10:02.337Z] ERROR [LoggingDecorator] gemini[rl][cb][pq][cost] gemini-2.0-flash failed after 3062ms {error: 'Rate limited'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
logger-service.ts:137 [12:10:02.337] WARN [ExecutionGovernor] Operation op-ms7h1fqj-t failed {type=debate, error=Rate limited}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
logger-service.ts:140 [12:10:02.339] INFO [DebateLlmCaller] PROVIDER SWITCH {from=gemini, to=groq, model=llama-3.3-70b-versatile, agentId=agent-architect}
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
main.tsx:39 [Memory] heap: 165.4MB / 296.8MB
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
logger.ts:20 [2026-07-30T12:10:05.522Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.3-70b-versatile failed after 2230ms {error: '429 {"error":{"message":"Rate limit reached for mo…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
logger-service.ts:137 [12:10:05.522] WARN [ExecutionGovernor] Operation op-ms7h1iu3-u failed {type=debate, error=429 {"error":{"message":"Rate limit reached for model `llama-3.3-70b-versatile` in organization `org_01ksfa472we598mxm5qasye8zb` service tier `on_demand` on tokens per day (TPD): Limit 100000, Used 99…}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 413 (Content Too Large)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
logger.ts:20 [2026-07-30T12:10:06.826Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.1-8b-instant failed after 265ms {error: '413 {"error":{"message":"Request too large for mod…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
logger-service.ts:137 [12:10:06.827] WARN [ExecutionGovernor] Operation op-ms7h1lcx-v failed {type=debate, error=413 {"error":{"message":"Request too large for model `llama-3.1-8b-instant` in organization `org_01krc00yf2fgrt97173kp900za` service tier `on_demand` on tokens per minute (TPM): Limit 6000, Requested …}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
logger-service.ts:140 [12:10:06.828] INFO [DebateLlmCaller] PROVIDER SWITCH {from=groq, to=nvidia, model=meta/llama-3.1-8b-instruct, agentId=agent-architect}
logger-service.ts:137 [12:10:07.888] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-architect, provider=nvidia, model=meta/llama-3.1-8b-instruct, keyId=12f61e6f, rejectCount=2, maxRejects=3, preview=Я благодарен за возможность ответить на аргументы моих оппонентов. [Ecologist / Эколог]: Дай я удостоверюсь, что правил}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
main.tsx:39 [Memory] heap: 196.7MB / 317.4MB
main.tsx:39 [Memory] heap: 221.1MB / 336.4MB
logger.ts:20 [2026-07-30T12:11:08.706Z] ERROR [LoggingDecorator] nvidia-nim[rl][cb][pq][cost] meta/llama-3.3-70b-instruct failed after 60027ms {error: 'nvidia-nim request timed out after 60000ms'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
logger-service.ts:137 [12:11:08.706] WARN [ExecutionGovernor] Operation op-ms7h1mzq-x failed {type=debate, error=nvidia-nim request timed out after 60000ms}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
logger-service.ts:137 [12:11:08.708] WARN [DebateProviderResolver] Step 4: no available provider {triedKeys=["groq:2994de58 canUse=true active=true authOk=true triedAlready=true","gemini:049ba4a7 canUse=true active=true authOk=true triedAlready=true","openrouter:85883ccb canUse=false active=true authOk=true…, failedProviders=["openrouter"]}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-query-engine.ts:378
(anonymous) @ debate-llm-caller.ts:374
logger-service.ts:140 [12:11:08.716] INFO [DebateLlmCaller] PROVIDER SWITCH {from=nvidia, to=openrouter, model=meta-llama/llama-3.1-8b-instruct, agentId=agent-architect}
llm-http-client.ts:191 POST http://localhost:5173/proxy/openrouter/api/v1/chat/completions 402 (Payment Required)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ openrouter-adapter.ts:177
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
logger.ts:20 [2026-07-30T12:11:10.818Z] ERROR [LoggingDecorator] openrouter[rl][cb][pq][cost] meta-llama/llama-3.1-8b-instruct failed after 726ms {error: 'openrouter'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
logger-service.ts:137 [12:11:10.818] WARN [ExecutionGovernor] Operation op-ms7h2ydo-y failed {type=debate, error=openrouter}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
logger-service.ts:137 [12:11:10.819] WARN [DebateProviderResolver] Step 4: no available provider {triedKeys=["groq:2994de58 canUse=true active=true authOk=true triedAlready=true","gemini:049ba4a7 canUse=true active=true authOk=true triedAlready=true","openrouter:85883ccb canUse=false active=true authOk=true…, failedProviders=["openrouter"]}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-query-engine.ts:378
(anonymous) @ debate-llm-caller.ts:374
logger-service.ts:137 [12:11:32.354] WARN [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-architect, provider=openrouter, model=openrouter/free, keyId=b6bf823f, rejectCount=3, maxRejects=3, preview=Дай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что инвестиции в AWG в Ашдоде экономич}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:1956
logger-service.ts:137 [12:11:32.357] WARN [DebateProviderResolver] Step 4: no available provider {triedKeys=["groq:2994de58 canUse=true active=true authOk=true triedAlready=true","gemini:049ba4a7 canUse=true active=true authOk=true triedAlready=true","openrouter:85883ccb canUse=false active=true authOk=true…, failedProviders=["openrouter"]}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-query-engine.ts:378
(anonymous) @ debate-llm-caller.ts:374
logger-service.ts:137 [12:11:32.366] WARN [DebateProviderResolver] Step 6: ALL keys unavailable! {keySummary=["gemini:049ba4a7 status=active canUse=true authOk=true triedAlready=true","nvidia:12f61e6f status=active canUse=true authOk=true triedAlready=true","nvidia:142f5ef1 status=active canUse=true authOk=t…, rejectedCombos=["gemini|gemini-3.1-flash-lite|049ba4a7-303d-4378-9845-1895681e9f29","gemini|gemini-3.1-flash-lite|*","nvidia|meta/llama-3.1-8b-instruct|12f61e6f-d9ed-4d09-9d86-830276b73817","nvidia|meta/llama-3.1-8b…}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-query-engine.ts:435
(anonymous) @ debate-llm-caller.ts:374
logger-service.ts:137 [12:11:32.366] WARN [DebateLlmCaller] resolveProvider returned null {anyWorking=false, allKeysCount=18, failedProviders=["openrouter"]}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-llm-caller.ts:416
logger-service.ts:134 [12:11:32.367] ERROR [DebateLlmCaller] debateCallLlm unhandled error {sessionId=debate-ms7gy4il-f376b23d-c1b3-41f4-a157-b1a8141c6810, agentId=agent-architect, error=Error: All LLM providers unavailable — debate cannot proceed}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:101
(anonymous) @ debate-llm-caller.ts:2611
main.tsx:39 [Memory] heap: 107.6MB / 147.3MB
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 429 (Too Many Requests)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
retryRequest @ groq-sdk.js?v=798e8e37:1616
await in retryRequest
makeRequest @ groq-sdk.js?v=798e8e37:1535
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger.ts:20 [2026-07-30T12:11:36.400Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.3-70b-versatile failed after 2299ms {error: '429 {"error":{"message":"Rate limit reached for mo…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:137 [12:11:36.401] WARN [ExecutionGovernor] Operation op-ms7h3gwk-10 failed {type=debate, error=429 {"error":{"message":"Rate limit reached for model `llama-3.3-70b-versatile` in organization `org_01ksfa472we598mxm5qasye8zb` service tier `on_demand` on tokens per day (TPD): Limit 100000, Used 99…}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIP9lSRfSuPp12Cg75/t0EUmxRE/UnLbw3v3ux69+xRixQY7nnQQIA6tbpJPsou"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"dz9ras_YC7WVnsEP87fYyAg"}
(anonymous) @ gemini-adapter.ts:80
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
(anonymous) @ probe-service.ts:119
groq-adapter.ts:69 POST https://api.groq.com/openai/v1/chat/completions 413 (Content Too Large)
fetchWithTimeout @ groq-sdk.js?v=798e8e37:1583
makeRequest @ groq-sdk.js?v=798e8e37:1495
await in makeRequest
request @ groq-sdk.js?v=798e8e37:1470
methodRequest @ groq-sdk.js?v=798e8e37:1461
post @ groq-sdk.js?v=798e8e37:1449
create @ groq-sdk.js?v=798e8e37:723
(anonymous) @ groq-adapter.ts:69
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger.ts:20 [2026-07-30T12:11:38.587Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.1-8b-instant failed after 422ms {error: '413 {"error":{"message":"Request too large for mod…g","type":"tokens","code":"rate_limit_exceeded"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:137 [12:11:38.588] WARN [ExecutionGovernor] Operation op-ms7h3k1h-11 failed {type=debate, error=413 {"error":{"message":"Request too large for model `llama-3.1-8b-instant` in organization `org_01krc00yf2fgrt97173kp900za` service tier `on_demand` on tokens per minute (TPM): Limit 6000, Requested …}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:140 [12:11:38.591] INFO [DebateLlmCaller] PROVIDER SWITCH {from=groq, to=gemini, model=gemini-3.1-flash-lite, agentId=agent-critic}
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIPVjrihdENe9dmrdxOeBe+QdN/c5SBE2gsF1WCDjisY+vTJRT1FERYaD3KtlYW"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"fz9raqGpNtuvnsEP3LfCsQY"}
(anonymous) @ gemini-adapter.ts:80
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":", которые имеют прямую рыночную стоимость (от рыболовства до защиты побережья). Разве мы не совершаем экономическую ошибку, оценивая стоимость «кубометра воды» в вакууме, игнорируя скрытые затраты на восстановление морских экосистем, разрушаемых рассолом, которые в долгосрочной перспективе перекроют любые выгоды от энергоэффективности опреснения?\n\n---\n\nЯ понимаю, что для вас важна экономическая стабильность, так как именно она обеспечивает предсказуемость бюджетов и планирования в масштабах города, однако я призываю вас взглянуть на эту проблему через призму «инновационного разрыва».\n\nДай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что инвестиции в AWG в Ашдоде экономически нерациональны из-за «барьера энергоемкости», и любые средства следует направлять исключительно на оптимизацию централизованной системы опреснения. Я правильно тебя понял?\n\nМое возражение: вы совершаете классическую ошибку «затонув
(anonymous) @ gemini-adapter.ts:80
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"=== CRITIQUE ===\nТвой аргумент грешит идеализмом «технологического оптимизма», полностью игнорируя реальность дефицита ресурсов в Ашдоде: город не может позволить себе «R&D-платформу» в ущерб гарантированному водоснабжению миллионов жителей. Ты подменяешь решение критической инфраструктурной задачи долгосрочной стратегией экспорта технологий, по сути, предлагая налогоплательщикам субсидировать стартапы под видом обеспечения жизнедеятельности города.\n\n=== STRENGTHENED ===\nМой оппонент прав: надежность снабжения — приоритет, и AWG не может заменить опреснение «завтра». Однако ошибка в том, чтобы рассматривать их как взаимоисключающие сущности. Я предлагаю модель **гибридной интеграции**, где AWG внедряется не как альтернатива, а как инструмент «сглаживания пиков» (peak shaving) и децентрализованного резервирования (critical resilience layer).\n\nВместо того чтобы тратить миллиарды на расширение централизованных мощностей, подверженных риск
(anonymous) @ gemini-adapter.ts:80
logger-service.ts:137 [12:11:50.797] WARN [DebatePersistence] saveSnapshot version=1 for debate-ms7gy4il-f376b23d-c1b3-41f4-a157-b1a8141c6810 phase=deliberating round=2
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-persistence-manager.ts:239
(anonymous) @ debate-engine.ts:1175
(anonymous) @ debate-sync-manager.ts:744
(anonymous) @ debate-sync-manager.ts:677
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIPbKsz9qCpXt1jQNkbD6M3u8opz7q/SspNIgx2l3KX40KKEOQq9Vv4TusugU5v"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"gz9rasKjJLzDvdIP5sSDsQg"}
(anonymous) @ gemini-adapter.ts:80
logger-service.ts:137 [12:11:51.966] WARN [DebatePersistence] saveSnapshot version=1 for debate-ms7gy4il-f376b23d-c1b3-41f4-a157-b1a8141c6810 phase=deliberating round=2
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-persistence-manager.ts:239
(anonymous) @ debate-engine.ts:1175
(anonymous) @ debate-sync-manager.ts:535
(anonymous) @ debate-sync-manager.ts:753
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:677
logger-service.ts:140 [12:11:51.970] INFO [DebatePhaseHandler] Skipping saveSnapshot for cancelled {sessionId=debate-ms7gy4il-f376b23d-c1b3-41f4-a157-b1a8141c6810}
logger-service.ts:140 [12:11:51.994] INFO [MemoryTracker] [AfterFinalize] ctx=0 sess=0 bud=0 mem=0 start=0 timeout=0 abortC=0 abortA=0 phaseC=0 run=0 preflight=0 warm=3 unsub=0 initUnsub=2 vCache=1 rSess=null actSess=0B embCh=0 polR=0 polF=0 modeV=0 strV=0 ebL=134 hist=5 livEv=0 livRd=0 livMp=0 actSess=1
logger.ts:20 [2026-07-30T12:11:52.486Z] ERROR [LoggingDecorator] nvidia-nim[rl][cb][pq][cost] meta/llama-3.3-70b-instruct failed after 729ms {error: 'SessionCancelled'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1920
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:137 [12:11:52.486] WARN [ExecutionGovernor] Operation op-ms7h3uj0-13 failed {type=debate, error=SessionCancelled}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1941
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
logger-service.ts:140 [12:11:52.630] INFO [QualityImpactCollector] Session debate-ms7gy4il-f376b23d-c1b3-41f4-a157-b1a8141c6810: 7 techniques
logger-service.ts:140 [12:11:52.631] INFO [QualityImpactCollector] response-features: +0.0% {n=11, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [12:11:52.631] INFO [QualityImpactCollector] shadow-opponent: +0.0% {n=11, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [12:11:52.631] INFO [QualityImpactCollector] entanglement: +0.0% {n=37, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [12:11:52.631] INFO [QualityImpactCollector] steelman: +0.0% {n=37, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [12:11:52.631] INFO [QualityImpactCollector] consistency-check: +0.0% {n=34, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [12:11:52.631] INFO [QualityImpactCollector] vulnerability-targeting: +0.0% {n=32, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [12:11:52.631] INFO [QualityImpactCollector] fact-checking: +0.0% {n=12, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:137 [12:11:52.936] WARN [DebateSyncManager] Skipping finalize — runtimeSessionId changed, old session not terminal {expected=debate-ms7gy4il-f376b23d-c1b3-41f4-a157-b1a8141c6810, phase=unknown}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-sync-manager.ts:459
logger-service.ts:137 [12:11:53.420] WARN [PricingService] Unknown model "meta-llama/llama-3.1-8b-instruct" — using fallback pricing
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ pricing-service.ts:158
(anonymous) @ pricing-service.ts:169
(anonymous) @ key-analytics.ts:159
(anonymous) @ key-service.ts:1045
(anonymous) @ key-registry.ts:820
(anonymous) @ key-service.ts:1043
(anonymous) @ probe-service.ts:227
await in (anonymous)
(anonymous) @ probe-service.ts:461
llm-http-client.ts:191 POST http://localhost:5173/proxy/openrouter/api/v1/chat/completions 402 (Payment Required)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ openrouter-adapter.ts:177
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
logger.ts:20 [2026-07-30T12:11:54.192Z] ERROR [LoggingDecorator] openrouter[rl][cb][pq][cost] meta-llama/llama-3.1-8b-instruct failed after 189ms {error: 'openrouter'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIPyl183capljCfPnydeHc8arR66iyy3BtP9YRcu49xtNVncPKdkIOP8aS14ZRY"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"iz9ravOZGeqKvdIPoauq-AU"}
(anonymous) @ gemini-adapter.ts:80
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
llm-http-client.ts:191 POST http://localhost:5173/proxy/openrouter/api/v1/chat/completions 402 (Payment Required)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ openrouter-adapter.ts:177
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
logger.ts:20 [2026-07-30T12:11:59.485Z] ERROR [LoggingDecorator] openrouter[rl][cb][pq][cost] meta-llama/llama-3.1-8b-instruct failed after 1373ms {error: 'openrouter'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIPT+RAhnsj/eT3wUjznPiU+WLIhox/W+aEAxurTe4ulVpgCSiCxuqmQBL79UVs"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"kD9ravLqA8KlkdUPk86OmQc"}
(anonymous) @ gemini-adapter.ts:80
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIPq36GFlhw163jq198zSiiuXToyEIHWdlQDQTMvOoAqaA/CnLXH4L9+mlOSuFS"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"kT9raob0IfuLkdUP7p7ZwQs"}
(anonymous) @ gemini-adapter.ts:80
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
llm-http-client.ts:191 POST http://localhost:5173/proxy/openrouter/api/v1/chat/completions 402 (Payment Required)
(anonymous) @ llm-http-client.ts:191
await in (anonymous)
(anonymous) @ openrouter-adapter.ts:177
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:385
(anonymous) @ circuit-breaker.ts:208
(anonymous) @ circuit-breaker.ts:384
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
logger.ts:20 [2026-07-30T12:12:03.918Z] ERROR [LoggingDecorator] openrouter[rl][cb][pq][cost] meta-llama/llama-3.1-8b-instruct failed after 369ms {error: 'openrouter'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:461
main.tsx:39 [Memory] heap: 107.8MB / 199.0MB
main.tsx:45 [Memory] Still alive after 5 minutes
main.tsx:39 [Memory] heap: 104.3MB / 173.7MB
main.tsx:39 [Memory] heap: 103.9MB / 116.5MB
