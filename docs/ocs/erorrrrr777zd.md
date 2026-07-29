react-dom_client.js?v=798e8e37:14338 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
logger-service.ts:140 [23:11:17.578] INFO  [DatabaseService] No clean shutdown flag — possible crash, running integrity scan
logger-service.ts:140 [23:11:17.595] INFO  [DatabaseService] Migration v5→v6: table 'keyValue' indexes changed: [id] → [id, createdAt]
logger-service.ts:140 [23:11:17.595] INFO  [DatabaseService] Migration v10→v11: table 'debateSessions' indexes changed: [id, phase, updatedAt] → [id, phase, updatedAt, topic, folder, isArchived]
logger-service.ts:140 [23:11:17.597] INFO  [DatabaseService] Integrity auto-scan started {intervalMs=1800000}
logger-service.ts:140 [23:11:17.598] INFO  [Runtime] Storage initialized {hasStorageLayer=true, hasKeys=true, keysType=object, hasListKeys=true, storageBackend=dexie}
logger-service.ts:140 [23:11:17.598] INFO  [Bootstrap] Initializing Super-Agents OS Runtime...
logger-service.ts:140 [23:11:17.599] INFO  [Phase0EventBridge] EventBridge initialized
phase1-foundation.ts:55 [KEY_FLOW] keyStore implementation type: Object
logger-service.ts:140 [23:11:17.601] INFO  [ExperimentEngine] init {count=0}
logger-service.ts:137 [23:11:17.610] WARN  [CompromiseWebhook] Webhook secret not configured — compromise detection is DISABLED. Set CONFIG.security.webhookSecret to enable.
(anonymous) @ logger-service.ts:137
logger-service.ts:140 [23:11:17.755] INFO  [DexieIdentity] [DEXIE_ANCHOR] first anchor set {source=database-service:singleton, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17}
logger-service.ts:140 [23:11:17.784] INFO  [KeyMigration] Migration already completed — skipping
logger-service.ts:140 [23:11:17.823] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=bootstrap:step3, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17, timestamp=1785366677823}
logger-service.ts:140 [23:11:17.827] INFO  [Bootstrap] Snapshot repo count {count=17}
bootstrap-key-init.ts:133 [BOOTSTRAP_SNAPSHOT_FINAL] count: 17
bootstrap-key-init.ts:134 [BOOTSTRAP_SNAPSHOT_SOURCE] keystore
logger-service.ts:140 [23:11:18.095] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=key-storage-hydrator:start, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17, timestamp=1785366678095}
logger-service.ts:140 [23:11:18.110] INFO  [KeyStorageHydrator] dexieKeys.length = 17 from instance [object Object]
key-registry.ts:179 [KEY_REGISTRY_OVERWRITE] Object
(anonymous) @ key-registry.ts:179
(anonymous) @ key-service.ts:419
(anonymous) @ key-storage-hydrator.ts:54
logger-service.ts:140 [23:11:18.177] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=KeyRegistry.forceResyncFromDexie, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17, timestamp=1785366678177}
logger-service.ts:140 [23:11:18.220] INFO  [KeyRegistry] [KEY_TRACE] loadDexie: 0 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…, source=repo.getAll()}
logger-service.ts:140 [23:11:18.222] INFO  [KeyRegistry] [KEY_TRACE] normalize.map: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [23:11:18.222] INFO  [KeyRegistry] [KEY_TRACE] filterValid: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [23:11:18.222] INFO  [KeyRegistry] [KEY_TRACE] assign: 0 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [23:11:19.167] INFO  [DatabaseService] Startup integrity scan: all tables clean
logger-service.ts:140 [23:11:19.251] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=KeyRegistry.loadKeys, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17, timestamp=1785366679251}
logger-service.ts:140 [23:11:19.251] INFO  [KeyRegistry] using bootstrap snapshot ONLY, count: 17
logger-service.ts:140 [23:11:19.251] INFO  [KeyRegistry] [KEY_TRACE] bootstrap.normalize.map: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [23:11:19.252] INFO  [KeyRegistry] [KEY_TRACE] bootstrap.filterValid: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:140 [23:11:19.254] INFO  [KeyRegistry] [KEY_TRACE] bootstrap.decrypt: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":39,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen"…}
logger-service.ts:140 [23:11:19.256] INFO  [KeyRegistry] [KEY_TRACE] bootstrap.assign: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":39,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen"…}
logger-service.ts:140 [23:11:19.260] INFO  [KeyLifecycle] Counters restored from DB {errorCount=4, successCount=13}
logger-service.ts:140 [23:11:19.421] INFO  [SchedulerService] Scheduler started
logger-service.ts:140 [23:11:19.421] INFO  [SchedulerService] Initialized with 0 schedules
logger-service.ts:140 [23:11:19.422] INFO  [Orchestrator] Mounted topology: Agent Workforce (v2.0.0)
logger-service.ts:137 [23:11:22.182] WARN  [DebateEngine] Orphaned failed session auto-failed (zombie) {sessionId=debate-ms6op4gg-5ad3dd85-2410-400c-9c19-51730eafdf37, age=816633}
(anonymous) @ logger-service.ts:137
logger-service.ts:140 [23:11:22.201] INFO  [Bootstrap] Group Manager synced existing keys
logger-service.ts:140 [23:11:22.202] INFO  [Bootstrap] KeyStateStore seeded with 17 key(s)
logger-service.ts:140 [23:11:22.822] INFO  [Bootstrap] DebateService initialized
logger-service.ts:140 [23:11:22.823] INFO  [Bootstrap] MemoryWatchdog pressure callbacks registered
logger-service.ts:140 [23:11:23.289] INFO  [CrossTabStateSync] Initialized with BroadcastChannel {tabId=ms6p8114-d94b8072-e8fc-4038-ba2e-0f5a06c1a35e}
logger-service.ts:140 [23:11:46.869] INFO  [DebateSyncManager] Starting debate {topic=Should AI be regulated?, participants=2, strategy=round_robin, maxRounds=2}
main.tsx:39 [Memory] heap: 121.7MB / 123.7MB
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"OK","thoughtSignature":"EjQKMgERTTIPgC7Ybfr1DPrSi7IeOQFRfH2L1LMJhXOOl7isecmZz3W+/HV9fwDRNVNLgB8V"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":1,"totalTokenCount":6,"promptTokensDetails":[{"modality":"TEXT","tokenCount":5}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"tYhqasjXBO67vdIP59HgkAc"}
(anonymous) @ gemini-adapter.ts:80
main.tsx:39 [Memory] heap: 127.2MB / 132.5MB
logger-service.ts:137 [23:12:22.313] WARN  [DebatePersistence] saveSnapshot version=1 for debate-ms6p8nna-aa3b1f55-479e-4081-9231-d56dfc3ebcbc phase=deliberating round=2
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-persistence-manager.ts:239
(anonymous) @ debate-engine.ts:1175
(anonymous) @ debate-sync-manager.ts:725
(anonymous) @ debate-sync-manager.ts:658
setTimeout
(anonymous) @ debate-sync-manager.ts:656
(anonymous) @ debate-sync-manager.ts:759
(anonymous) @ event-bus.ts:444
(anonymous) @ event-bus.ts:442
(anonymous) @ event-bus.ts:266
(anonymous) @ debate-pipeline-builder.ts:221
logger-service.ts:137 [23:12:23.077] WARN  [DebatePersistence] saveSnapshot version=1 for debate-ms6p8nna-aa3b1f55-479e-4081-9231-d56dfc3ebcbc phase=deliberating round=2
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-persistence-manager.ts:239
(anonymous) @ debate-engine.ts:1175
(anonymous) @ debate-sync-manager.ts:516
(anonymous) @ debate-sync-manager.ts:734
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:658
setTimeout
(anonymous) @ debate-sync-manager.ts:656
(anonymous) @ debate-sync-manager.ts:759
(anonymous) @ event-bus.ts:444
(anonymous) @ event-bus.ts:442
(anonymous) @ event-bus.ts:266
(anonymous) @ debate-pipeline-builder.ts:221
logger-service.ts:140 [23:12:23.081] INFO  [DebatePhaseHandler] Skipping saveSnapshot for cancelled {sessionId=debate-ms6p8nna-aa3b1f55-479e-4081-9231-d56dfc3ebcbc}
logger-service.ts:140 [23:12:23.095] INFO  [MemoryTracker] [AfterFinalize] ctx=0 sess=4 bud=4 mem=4 start=0 timeout=0 abortC=0 abortA=0 phaseC=0 run=0 preflight=0 warm=3 unsub=0 initUnsub=2 vCache=1 rSess=null actSess=0B embCh=0 polR=0 polF=0 modeV=0 strV=0 ebL=133 hist=0 livEv=0 livRd=0 livMp=0 actSess=1
logger-service.ts:140 [23:12:23.437] INFO  [AutoDebateService] Match 1/3 OK {a=NVIDIA Secondary-pro, b=Groq Tertiary-con, durationMs=36568}
logger-service.ts:140 [23:12:24.235] INFO  [QualityImpactCollector] Session debate-ms6p8nna-aa3b1f55-479e-4081-9231-d56dfc3ebcbc: 6 techniques
logger-service.ts:140 [23:12:24.235] INFO  [QualityImpactCollector] response-features: +0.0% {n=3, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:12:24.236] INFO  [QualityImpactCollector] shadow-opponent: +0.0% {n=3, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:12:24.236] INFO  [QualityImpactCollector] entanglement: +0.0% {n=2, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:12:24.236] INFO  [QualityImpactCollector] steelman: +0.0% {n=2, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:12:24.236] INFO  [QualityImpactCollector] fact-checking: +0.0% {n=2, sessions=1, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:12:24.236] INFO  [QualityImpactCollector] consistency-check: +0.0% {n=1, sessions=1, pValue=1.0000, confidence=none}
logger.ts:20 [2026-07-29T23:12:24.605Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.3-70b-versatile failed after 1554ms {error: 'Request was aborted.'}
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
logger-service.ts:137 [23:12:24.606] WARN  [ExecutionGovernor] Operation op-ms6p9fkb-4 failed {type=debate, error=Request was aborted.}
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
logger-service.ts:137 [23:12:28.709] WARN  [DebateSyncManager] Skipping finalize — runtimeSessionId changed {expected=debate-ms6p8nna-aa3b1f55-479e-4081-9231-d56dfc3ebcbc}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-sync-manager.ts:442
setTimeout
(anonymous) @ debate-pipeline-builder.ts:297
(anonymous) @ debate-pipeline-builder.ts:296
groq-adapter.ts:69  POST https://api.groq.com/openai/v1/chat/completions 400 (Bad Request)
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
(anonymous) @ insight-engine.ts:237
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
logger.ts:20 [2026-07-29T23:12:28.791Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] mixtral-8x7b-32768 failed after 1331ms {error: '400 {"error":{"message":"The model `mixtral-8x7b-3…id_request_error","code":"model_decommissioned"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ insight-engine.ts:237
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"{\n  \"suggestions\": [\n    {\n      \"type\": \"accuracy\",\n      \"title\": \"Define Model Routing Logic\",\n      \"description\": \"The current topology uses 'auto' providers for all 27 nodes. Implement explicit routing based on task complexity (e.g., routing simple classification tasks to smaller, low-cost models and complex reasoning to high-parameter models) to improve accuracy.\",\n      \"impact\": \"high\"\n    },\n    {\n      \"type\": \"latency\",\n      \"title\": \"Optimize Topology Density\",\n      \"description\": \"Operating 27 nodes simultaneously without defined metrics suggests an over-provisioned architecture. Consolidate redundant nodes to reduce overhead and potential cold-start latency jitter.\",\n      \"impact\": \"medium\"\n    },\n    {\n      \"type\": \"security\",\n      \"title\": \"Implement Provider Monitoring\",\n      \"description\": \"Reliability data is currently missing. Integrate logging and telem
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
(anonymous) @ insight-engine.ts:237
await in (anonymous)
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
logger-service.ts:140 [23:12:33.487] INFO  [MemoryTracker] [TournamentMatch1] embCh=0 polR=0 polF=0 modeV=0 strV=0 ebL=133 hist=0 livEv=1 livRd=1 livMp=1 actSess=0
logger-service.ts:140 [23:12:33.487] INFO  [DebateSyncManager] Starting debate {topic=Should AI be regulated?, participants=2, strategy=round_robin, maxRounds=2}
main.tsx:39 [Memory] heap: 192.3MB / 201.3MB
logger-service.ts:137 [23:12:57.233] WARN  [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=auto-ms6p8nn9-913f0769-82b7-4525-b00c-84d62bfcb91e, provider=nvidia, model=meta/llama-3.1-8b-instruct, keyId=0c1925c2, rejectCount=1, maxRejects=3, preview=Добрый день! Я согласен с тем, что регулирование AI является сложной проблемой, требующей тщательного рассмотрения. Одна}
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
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
await in (anonymous)
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ phase6-high-level.ts:173
(anonymous) @ auto-debate-service.ts:458
(anonymous) @ auto-debate-service.ts:515
main.tsx:39 [Memory] heap: 191.9MB / 194.7MB
logger-service.ts:140 [23:13:33.500] INFO  [AutoDebateService] Match 2/3 OK {a=NVIDIA Secondary-pro, b=NVIDIA Tertiary-neutral, durationMs=60013}
logger-service.ts:140 [23:13:43.502] INFO  [MemoryTracker] [TournamentMatch2] embCh=0 polR=0 polF=0 modeV=0 strV=0 ebL=142 hist=0 livEv=0 livRd=0 livMp=0 actSess=0
logger-service.ts:140 [23:13:43.503] INFO  [DebateSyncManager] Starting debate {topic=Should AI be regulated?, participants=2, strategy=round_robin, maxRounds=2}
logger-service.ts:140 [23:13:43.505] INFO  [DebatePhaseHandler] Skipping saveSnapshot for cancelled {sessionId=debate-ms6p9nm8-1abbb306-7f2b-45b9-83b7-64ab80b1ff47}
logger.ts:20 [2026-07-29T23:13:44.586Z] ERROR [LoggingDecorator] nvidia-nim[rl][cb][pq][cost] meta/llama-3.3-70b-instruct failed after 24625ms {error: 'SessionCancelled'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-shadow-opponent-service.ts:77
(anonymous) @ debate-llm-caller.ts:2099
await in (anonymous)
(anonymous) @ debate-engine.ts:906
(anonymous) @ debate-engine.ts:801
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:181
(anonymous) @ debate-pipeline-builder.ts:156
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
await in (anonymous)
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ phase6-high-level.ts:173
(anonymous) @ auto-debate-service.ts:458
(anonymous) @ auto-debate-service.ts:515
main.tsx:39 [Memory] heap: 193.0MB / 194.4MB
logger-service.ts:137 [23:13:50.316] WARN  [DebateSyncManager] Skipping finalize — runtimeSessionId changed {expected=debate-ms6p9nm8-1abbb306-7f2b-45b9-83b7-64ab80b1ff47, actual=debate-ms6pb5n6-fbdd6172-d1a0-4184-aa66-782fbb562808}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-sync-manager.ts:442
Promise.then
(anonymous) @ debate-sync-manager.ts:416
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ phase6-high-level.ts:173
(anonymous) @ auto-debate-service.ts:458
(anonymous) @ auto-debate-service.ts:515
logger-service.ts:137 [23:14:19.472] WARN  [DebatePersistence] saveSnapshot version=1 for debate-ms6pb5n6-fbdd6172-d1a0-4184-aa66-782fbb562808 phase=deliberating round=2
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-persistence-manager.ts:239
(anonymous) @ debate-engine.ts:1175
(anonymous) @ debate-sync-manager.ts:725
(anonymous) @ debate-sync-manager.ts:658
setTimeout
(anonymous) @ debate-sync-manager.ts:656
(anonymous) @ debate-sync-manager.ts:759
(anonymous) @ event-bus.ts:444
(anonymous) @ event-bus.ts:442
(anonymous) @ event-bus.ts:266
(anonymous) @ debate-pipeline-builder.ts:221
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
await in (anonymous)
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ phase6-high-level.ts:173
(anonymous) @ auto-debate-service.ts:458
(anonymous) @ auto-debate-service.ts:515
main.tsx:39 [Memory] heap: 196.8MB / 199.9MB
logger-service.ts:137 [23:14:20.605] WARN  [DebatePersistence] saveSnapshot version=1 for debate-ms6pb5n6-fbdd6172-d1a0-4184-aa66-782fbb562808 phase=deliberating round=2
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-persistence-manager.ts:239
(anonymous) @ debate-engine.ts:1175
(anonymous) @ debate-sync-manager.ts:516
(anonymous) @ debate-sync-manager.ts:734
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:658
setTimeout
(anonymous) @ debate-sync-manager.ts:656
(anonymous) @ debate-sync-manager.ts:759
(anonymous) @ event-bus.ts:444
(anonymous) @ event-bus.ts:442
(anonymous) @ event-bus.ts:266
(anonymous) @ debate-pipeline-builder.ts:221
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
await in (anonymous)
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ phase6-high-level.ts:173
(anonymous) @ auto-debate-service.ts:458
(anonymous) @ auto-debate-service.ts:515
logger-service.ts:140 [23:14:20.607] INFO  [DebatePhaseHandler] Skipping saveSnapshot for cancelled {sessionId=debate-ms6pb5n6-fbdd6172-d1a0-4184-aa66-782fbb562808}
logger-service.ts:140 [23:14:20.612] INFO  [MemoryTracker] [AfterFinalize] ctx=0 sess=4 bud=4 mem=4 start=0 timeout=0 abortC=0 abortA=0 phaseC=0 run=0 preflight=0 warm=3 unsub=0 initUnsub=2 vCache=1 rSess=null actSess=0B embCh=0 polR=0 polF=0 modeV=0 strV=0 ebL=133 hist=5 livEv=1 livRd=1 livMp=1 actSess=1
logger-service.ts:140 [23:14:20.977] INFO  [AutoDebateService] Match 3/3 OK {a=Groq Tertiary-con, b=NVIDIA Tertiary-neutral, durationMs=37475}
logger-service.ts:140 [23:14:21.731] INFO  [QualityImpactCollector] Session debate-ms6pb5n6-fbdd6172-d1a0-4184-aa66-782fbb562808: 6 techniques
logger-service.ts:140 [23:14:21.731] INFO  [QualityImpactCollector] response-features: +0.0% {n=3, sessions=2, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:14:21.731] INFO  [QualityImpactCollector] shadow-opponent: +0.0% {n=3, sessions=2, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:14:21.731] INFO  [QualityImpactCollector] entanglement: +0.0% {n=2, sessions=2, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:14:21.731] INFO  [QualityImpactCollector] steelman: +0.0% {n=2, sessions=2, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:14:21.731] INFO  [QualityImpactCollector] fact-checking: +0.0% {n=2, sessions=2, pValue=1.0000, confidence=none}
logger-service.ts:140 [23:14:21.731] INFO  [QualityImpactCollector] consistency-check: +0.0% {n=1, sessions=2, pValue=1.0000, confidence=none}
logger.ts:20 [2026-07-29T23:14:22.115Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] llama-3.3-70b-versatile failed after 1528ms {error: 'Request was aborted.'}
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
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
await in (anonymous)
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ phase6-high-level.ts:173
(anonymous) @ auto-debate-service.ts:458
(anonymous) @ auto-debate-service.ts:515
logger-service.ts:137 [23:14:22.115] WARN  [ExecutionGovernor] Operation op-ms6pby95-b failed {type=debate, error=Request was aborted.}
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
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
await in (anonymous)
(anonymous) @ debate-engine.ts:754
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:415
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ phase6-high-level.ts:173
(anonymous) @ auto-debate-service.ts:458
(anonymous) @ auto-debate-service.ts:515
logger-service.ts:137 [23:14:26.171] WARN  [DebateSyncManager] Skipping finalize — runtimeSessionId changed {expected=debate-ms6pb5n6-fbdd6172-d1a0-4184-aa66-782fbb562808}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ debate-sync-manager.ts:442
Promise.then
(anonymous) @ debate-sync-manager.ts:416
(anonymous) @ debate-sync-manager.ts:262
(anonymous) @ phase6-high-level.ts:173
(anonymous) @ auto-debate-service.ts:458
(anonymous) @ auto-debate-service.ts:515
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"{\n  \"suggestions\": [\n    {\n      \"type\": \"accuracy\",\n      \"title\": \"Define Model Explicitly\",\n      \"description\": \"The current topology uses 'auto' for all nodes, leading to non-deterministic model selection. Assign specific models based on task complexity (e.g., GPT-4o for reasoning, Haiku for throughput) to ensure predictable output quality.\",\n      \"impact\": \"high\"\n    },\n    {\n      \"type\": \"cost\",\n      \"title\": \"Consolidate Topology Nodes\",\n      \"description\": \"You are currently running 27 active nodes. Redundant nodes increase management overhead and cold-start latency. Consolidate to a tiered provider strategy to optimize resource utilization.\",\n      \"impact\": \"high\"\n    },\n    {\n      \"type\": \"security\",\n      \"title\": \"Implement Provider Monitoring\",\n      \"description\": \"There is zero reliability data for your providers. Integrate real-time health checks and circuit
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
(anonymous) @ insight-engine.ts:237
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
logger-service.ts:140 [23:14:31.027] INFO  [MemoryTracker] [TournamentMatch3] embCh=0 polR=0 polF=0 modeV=0 strV=0 ebL=133 hist=0 livEv=2 livRd=2 livMp=2 actSess=0
main.tsx:39 [Memory] heap: 129.7MB / 131.5MB
main.tsx:39 [Memory] heap: 129.9MB / 131.5MB
main.tsx:39 [Memory] heap: 130.1MB / 132.7MB
main.tsx:39 [Memory] heap: 130.4MB / 132.0MB
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"{\n  \"suggestions\": [\n    {\n      \"type\": \"accuracy\",\n      \"title\": \"Define Model Topology\",\n      \"description\": \"Current nodes are using generic 'auto' configurations. Specify models (e.g., GPT-4o, Claude 3.5 Sonnet) based on task complexity to improve output quality and predictability.\",\n      \"impact\": \"high\"\n    },\n    {\n      \"type\": \"cost\",\n      \"title\": \"Node Consolidation\",\n      \"description\": \"27 active nodes with no traffic indicates significant resource overhead. Reduce redundant nodes to minimize orchestration complexity and potential idle infrastructure costs.\",\n      \"impact\": \"medium\"\n    },\n    {\n      \"type\": \"security\",\n      \"title\": \"Implement Provider Monitoring\",\n      \"description\": \"Lack of reliability data creates a blind spot. Implement health checks and logging for each provider to detect outages or unexpected behavior patterns.\",\n      \"impact\": 
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
(anonymous) @ insight-engine.ts:237
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIPK+k4Rh9GQkBkGZtnof/DvCbznICDiLu4ZOtqKJ29/DPeGpfaoYdWdbD/5psw"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"1YlqatKQNvDikdUPrsKiiQQ"}
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
(anonymous) @ probe-service.ts:465
await in (anonymous)
(anonymous) @ probe-service.ts:119
logger-service.ts:137 [23:16:41.391] WARN  [PricingService] Unknown model "meta-llama/llama-3.1-8b-instruct" — using fallback pricing
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ pricing-service.ts:158
(anonymous) @ pricing-service.ts:169
(anonymous) @ key-analytics.ts:159
(anonymous) @ key-service.ts:1050
(anonymous) @ key-registry.ts:820
(anonymous) @ key-service.ts:1048
(anonymous) @ probe-service.ts:227
await in (anonymous)
(anonymous) @ probe-service.ts:465
await in (anonymous)
(anonymous) @ probe-service.ts:119
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIPTcW6MBsLRt9xvDLQNF00c1W6IWfl9NTvgqyRF5EkD6ZWXvaNMZH+655fUSAG"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"2olqasLRNvqE7M8Py9yi4Qk"}
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
(anonymous) @ probe-service.ts:465
await in (anonymous)
(anonymous) @ probe-service.ts:119
logger-service.ts:137 [23:16:45.321] WARN  [ProbeService] Heap too high — aborting probe cycle {heapMB=186.1, keysRemaining=9, keysTested=8}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ probe-service.ts:422
await in (anonymous)
(anonymous) @ probe-service.ts:119
main.tsx:39 [Memory] heap: 197.1MB / 205.0MB
main.tsx:45 [Memory] Still alive after 5 minutes
main.tsx:39 [Memory] heap: 133.1MB / 135.7MB
main.tsx:39 [Memory] heap: 134.3MB / 136.7MB
main.tsx:39 [Memory] heap: 135.0MB / 137.0MB
groq-adapter.ts:69  POST https://api.groq.com/openai/v1/chat/completions 400 (Bad Request)
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
(anonymous) @ insight-engine.ts:237
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
logger.ts:20 [2026-07-29T23:18:25.311Z] ERROR [LoggingDecorator] groq[rl][cb][pq][cost] mixtral-8x7b-32768 failed after 1179ms {error: '400 {"error":{"message":"The model `mixtral-8x7b-3…id_request_error","code":"model_decommissioned"}}'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ insight-engine.ts:237
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"{\n  \"suggestions\": [\n    {\n      \"type\": \"accuracy\",\n      \"title\": \"Model Heterogeneity\",\n      \"description\": \"The current topology utilizes an 'auto' configuration for all 27 nodes. Assign specific, specialized models based on task requirements to improve output quality and predictability.\",\n      \"impact\": \"high\"\n    },\n    {\n      \"type\": \"latency\",\n      \"title\": \"Topology Consolidation\",\n      \"description\": \"27 active nodes for a system with 0ms latency metrics suggests potential overhead or idle resource waste. Audit the necessity of the node count and collapse redundant nodes.\",\n      \"impact\": \"medium\"\n    },\n    {\n      \"type\": \"security\",\n      \"title\": \"Provider Diversification\",\n      \"description\": \"With 'auto' providers and no reliability data, the system lacks redundancy. Implement multi-provider routing to ensure failover capabilities.\",\n      \"impact\": \"hi
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
(anonymous) @ insight-engine.ts:237
await in (anonymous)
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
main.tsx:39 [Memory] heap: 133.9MB / 139.2MB
main.tsx:39 [Memory] heap: 134.8MB / 139.2MB
main.tsx:39 [Memory] heap: 135.0MB / 139.9MB
main.tsx:39 [Memory] heap: 136.1MB / 140.6MB
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"{\n  \"suggestions\": [\n    {\n      \"type\": \"accuracy\",\n      \"title\": \"Define Model Specificity\",\n      \"description\": \"Current nodes are set to 'auto' provider and model, leading to non-deterministic routing. Explicitly define model providers and versions to ensure consistent inference quality.\",\n      \"impact\": \"high\"\n    },\n    {\n      \"type\": \"latency\",\n      \"title\": \"Topology Consolidation\",\n      \"description\": \"The system currently utilizes 27 active nodes. High node counts introduce unnecessary overhead and complexity. Prune underutilized nodes and implement a pool-based architecture.\",\n      \"impact\": \"medium\"\n    },\n    {\n      \"type\": \"security\",\n      \"title\": \"Implement Provider Monitoring\",\n      \"description\": \"Lack of reliability data for providers poses a risk to system stability. Integrate comprehensive observability tools to track uptime, request/response timing,
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
(anonymous) @ insight-engine.ts:237
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
main.tsx:39 [Memory] heap: 135.6MB / 138.7MB
main.tsx:39 [Memory] heap: 136.7MB / 139.7MB
main.tsx:39 [Memory] heap: 82.2MB / 86.6MB
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"{\n  \"suggestions\": [\n    {\n      \"type\": \"accuracy\",\n      \"title\": \"Define Model-Specific Providers\",\n      \"description\": \"The current topology uses 'auto' for model and provider. This prevents predictable performance and optimization. Map nodes to specific models (e.g., GPT-4o, Claude 3.5 Sonnet) based on task requirements to improve deterministic output.\",\n      \"impact\": \"high\"\n    },\n    {\n      \"type\": \"security\",\n      \"title\": \"Implement Observability and Monitoring\",\n      \"description\": \"Provider reliability is currently 'No data'. Integrate logging and monitoring tools to track individual node health, response times, and error rates to prevent silent failures in the auto-routed infrastructure.\",\n      \"impact\": \"high\"\n    },\n    {\n      \"type\": \"cost\",\n      \"title\": \"Consolidate Topology Nodes\",\n      \"description\": \"With 27 active nodes currently configured for 'auto
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
(anonymous) @ insight-engine.ts:237
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIP0AJRvfqzL3abLOMvD90b3S77xbLW5rB0sc4Dv70kSj0e1rG+9TDLHvh4dExL"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"GotqaouoFcmjnsEPlf2TuAQ"}
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
(anonymous) @ probe-service.ts:465
await in (anonymous)
(anonymous) @ probe-service.ts:119
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIP5riTtyJgdio7XvRosb+uZpJ3yW+R+O9CyCCoJd4yWoF0p5/MZ/XnV9Ux5S59"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"IItqavL2Jce-nsEPxfjkyQQ"}
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
(anonymous) @ probe-service.ts:465
await in (anonymous)
(anonymous) @ probe-service.ts:119
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"4","thoughtSignature":"EjQKMgERTTIPGuh5v7jE3BkUrYHerFaUOSUc54zM0EFrH24m8Dxlytj6SCBeVOtslG5gP0r3"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":14,"candidatesTokenCount":1,"totalTokenCount":15,"promptTokensDetails":[{"modality":"TEXT","tokenCount":14}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"I4tqavjiHdm2nsEPwrjfsQs"}
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
(anonymous) @ probe-service.ts:465
await in (anonymous)
(anonymous) @ probe-service.ts:119
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
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:465
await in (anonymous)
(anonymous) @ probe-service.ts:119
logger.ts:20 [2026-07-29T23:22:14.679Z] ERROR [LoggingDecorator] openrouter[rl][cb][pq][cost] meta-llama/llama-3.1-8b-instruct failed after 769ms {error: 'openrouter'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ probe-service.ts:217
(anonymous) @ probe-service.ts:465
await in (anonymous)
(anonymous) @ probe-service.ts:119
main.tsx:39 [Memory] heap: 164.6MB / 173.0MB
main.tsx:45 [Memory] Still alive after 5 minutes
logger-service.ts:137 [23:22:21.796] WARN  [ProbeService] Heap too high — aborting probe cycle {heapMB=186.7, keysRemaining=5, keysTested=12}
(anonymous) @ logger-service.ts:137
(anonymous) @ logger-service.ts:97
(anonymous) @ probe-service.ts:422
await in (anonymous)
(anonymous) @ probe-service.ts:119
main.tsx:39 [Memory] heap: 138.9MB / 140.6MB
main.tsx:39 [Memory] heap: 139.5MB / 141.1MB
gemini-adapter.ts:80 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"{\n  \"suggestions\": [\n    {\n      \"type\": \"accuracy\",\n      \"title\": \"Define Model Routing\",\n      \"description\": \"Current topology uses 'auto' for all 27 nodes, leading to non-deterministic behavior. Define specific LLM providers and models based on task complexity to ensure consistent output quality.\",\n      \"impact\": \"high\"\n    },\n    {\n      \"type\": \"cost\",\n      \"title\": \"Consolidate Node Topology\",\n      \"description\": \"27 active nodes with 'auto' configuration suggest significant overhead. Consolidate to a tiered structure (e.g., small models for routing, large models for reasoning) to minimize unused capacity.\",\n      \"impact\": \"medium\"\n    },\n    {\n      \"type\": \"security\",\n      \"title\": \"Implement Provider Monitoring\",\n      \"description\": \"Provider reliability data is missing. Integrate health checks and circuit breakers to prevent cascading failures if an 'auto' select
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
(anonymous) @ insight-engine.ts:237
(anonymous) @ advisor-service.ts:253
(anonymous) @ advisor-service.ts:167
main.tsx:39 [Memory] heap: 139.4MB / 143.3MB
