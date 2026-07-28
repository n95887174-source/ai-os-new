react-dom_client.js?v=9326f852:14338 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
logger-service.ts:137 [18:28:29.221] INFO  [DatabaseService] No clean shutdown flag — possible crash, running integrity scan
logger-service.ts:137 [18:28:29.255] INFO  [DatabaseService] Migration v5→v6: table 'keyValue' indexes changed: [id] → [id, createdAt]
logger-service.ts:137 [18:28:29.255] INFO  [DatabaseService] Migration v10→v11: table 'debateSessions' indexes changed: [id, phase, updatedAt] → [id, phase, updatedAt, topic, folder, isArchived]
logger-service.ts:137 [18:28:29.256] INFO  [DatabaseService] Integrity auto-scan started {intervalMs=1800000}
logger-service.ts:137 [18:28:29.258] INFO  [Runtime] Storage initialized {hasStorageLayer=true, hasKeys=true, keysType=object, hasListKeys=true, storageBackend=dexie}
logger-service.ts:137 [18:28:29.259] INFO  [Bootstrap] Initializing Super-Agents OS Runtime...
logger-service.ts:137 [18:28:29.262] INFO  [Phase0EventBridge] EventBridge initialized
phase1-foundation.ts:55 [KEY_FLOW] keyStore implementation type: Object
logger-service.ts:137 [18:28:29.269] INFO  [ExperimentEngine] init {count=0}
logger-service.ts:134 [18:28:29.287] WARN  [CompromiseWebhook] Webhook secret not configured — compromise detection is DISABLED. Set CONFIG.security.webhookSecret to enable.
(anonymous) @ logger-service.ts:134
logger-service.ts:137 [18:28:29.586] INFO  [DexieIdentity] [DEXIE_ANCHOR] first anchor set {source=database-service:singleton, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17}
logger-service.ts:137 [18:28:29.631] INFO  [KeyMigration] Migration already completed — skipping
logger-service.ts:137 [18:28:29.632] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=bootstrap:step3, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17, timestamp=1785176909632}
logger-service.ts:137 [18:28:29.635] INFO  [Bootstrap] Snapshot repo count {count=17}
bootstrap-key-init.ts:133 [BOOTSTRAP_SNAPSHOT_FINAL] count: 17
bootstrap-key-init.ts:134 [BOOTSTRAP_SNAPSHOT_SOURCE] keystore
logger-service.ts:137 [18:28:29.764] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=key-storage-hydrator:start, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17, timestamp=1785176909764}
logger-service.ts:137 [18:28:29.771] INFO  [KeyStorageHydrator] dexieKeys.length = 17 from instance [object Object]
key-registry.ts:179 [KEY_REGISTRY_OVERWRITE] Object
(anonymous) @ key-registry.ts:179
(anonymous) @ key-service.ts:418
(anonymous) @ key-storage-hydrator.ts:54
key-registry.ts:192 [KEY_REGISTRY] reload() no-op during bootstrap phase
logger-service.ts:137 [18:28:29.875] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=KeyRegistry.forceResyncFromDexie, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17, timestamp=1785176909875}
logger-service.ts:137 [18:28:29.925] INFO  [KeyRegistry] [KEY_TRACE] loadDexie: 0 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…, source=repo.getAll()}
logger-service.ts:137 [18:28:29.926] INFO  [KeyRegistry] [KEY_TRACE] normalize.map: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:137 [18:28:29.928] INFO  [KeyRegistry] [KEY_TRACE] filterValid: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:137 [18:28:29.929] INFO  [KeyRegistry] [KEY_TRACE] assign: 0 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
key-registry.ts:551 [KEY_SYNC] force resync — committed count: 17
key-registry.ts:555 [KEY_DROP_TRACE] run=forceResync-ms3k8n9o-96530374-0598-49f9-8051-550b0f602373 stage=end final=17
logger-service.ts:137 [18:28:30.283] INFO  [EventRecorder] Recovered 370 events from WAL
logger-service.ts:137 [18:28:30.387] INFO  [DatabaseService] Startup integrity scan: all tables clean
logger-service.ts:137 [18:28:31.237] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=KeyRegistry.loadKeys, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=17, timestamp=1785176911237}
logger-service.ts:137 [18:28:31.237] INFO  [KeyRegistry] using bootstrap snapshot ONLY, count: 17
logger-service.ts:137 [18:28:31.237] INFO  [KeyRegistry] [KEY_TRACE] bootstrap.normalize.map: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:137 [18:28:31.238] INFO  [KeyRegistry] [KEY_TRACE] bootstrap.filterValid: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":134,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen…}
logger-service.ts:137 [18:28:31.242] INFO  [KeyRegistry] [KEY_TRACE] bootstrap.decrypt: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":39,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen"…}
logger-service.ts:137 [18:28:31.242] INFO  [KeyRegistry] [KEY_TRACE] bootstrap.assign: 17 -> 17 {sample=[{"id":"00ba6b88-fd97-4805-97d3-698aa1ade70f","provider":"gemini","hasKey":true,"keyLen":39,"isEncrypted":false},{"id":"0c1925c2-7aef-44b5-9639-96eedade1189","provider":"nvidia","hasKey":true,"keyLen"…}
key-registry.ts:319 [KEY_SYNC] final committed count: 17
key-service.ts:258 [KEY_FLOW] KeyService final keys count: Object
logger-service.ts:137 [18:28:32.085] INFO  [KeyLifecycle] Counters restored from DB {errorCount=4, successCount=15}
logger-service.ts:137 [18:28:33.554] INFO  [SchedulerService] Scheduler started
logger-service.ts:137 [18:28:33.554] INFO  [SchedulerService] Initialized with 0 schedules
logger-service.ts:137 [18:28:33.555] INFO  [Orchestrator] Mounted topology: Agent Workforce (v2.0.0)
logger-service.ts:137 [18:28:35.622] INFO  [Bootstrap] Group Manager synced existing keys
logger-service.ts:137 [18:28:35.623] INFO  [Bootstrap] KeyStateStore seeded with 17 key(s)
logger-service.ts:137 [18:28:35.943] INFO  [Bootstrap] DebateService initialized
logger-service.ts:137 [18:28:35.944] INFO  [Bootstrap] MemoryWatchdog pressure callbacks registered
logger-service.ts:137 [18:28:36.793] INFO  [CrossTabStateSync] Initialized with BroadcastChannel {tabId=ms3k8mu6-63674f27-8002-41e5-b61d-84901602500e}
main.tsx:39 [Memory] heap: 58.2MB / 59.8MB
main.tsx:39 [Memory] heap: 66.0MB / 67.3MB
DebatePanel.tsx:670 [DebatePanel] Stop clicked Object
debate-engine.ts:982 [cancelSession] ENTER Object
debate-engine.ts:1007 [cancelSession] phase=paused, runningSessions=0
debate-engine.ts:1095 [cancelSession] active phase paused — aborting agents Object
logger-service.ts:137 [18:29:51.000] INFO  [DebatePhaseHandler] Skipping saveSnapshot for cancelled {sessionId=debate-mrqbfcvs-a0092d5d-033d-43f3-8151-301b50042e0b}
debate-engine.ts:1111 [cancelSession] transition done, phase=cancelled Object
debate-engine.ts:1119 [cancelSession] cleanup done (active path) Object
DebatePanel.tsx:677 [DebatePanel] cancelSession OK Object
main.tsx:39 [Memory] heap: 66.4MB / 74.9MB
main.tsx:39 [Memory] heap: 65.3MB / 67.6MB
main.tsx:39 [Memory] heap: 68.2MB / 70.4MB
main.tsx:39 [Memory] heap: 66.7MB / 75.1MB
DebatePanel.tsx:670 [DebatePanel] Stop clicked Object
debate-engine.ts:982 [cancelSession] ENTER Object
debate-engine.ts:989 [cancelSession] session not found Object
(anonymous) @ debate-engine.ts:989
DebatePanel.tsx:677 [DebatePanel] cancelSession OK Object
DebatePanel.tsx:670 [DebatePanel] Stop clicked Object
debate-engine.ts:982 [cancelSession] ENTER Object
debate-engine.ts:989 [cancelSession] session not found Object
(anonymous) @ debate-engine.ts:989
DebatePanel.tsx:677 [DebatePanel] cancelSession OK Object
main.tsx:39 [Memory] heap: 68.2MB / 73.4MB
logger-service.ts:137 [18:32:07.033] INFO  [DebateSyncManager] Starting debate {topic=Should AI be regulated?, participants=2, strategy=round_robin, maxRounds=2}
router-debate-selector.ts:75 [DEBATE_FALLBACK] getDebateProviders primary pass Object
router-debate-selector.ts:128 [DEBATE_FALLBACK] getDebateProviders active after filter Object
gemini-adapter.ts:58 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"OK","thoughtSignature":"EjQKMgERTTIPtA3jbUXsbowC0jJBJ+hbcyrwVyMXjE45FsLF7c38hpBnqhNHYZyvW+NAP4AD"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":1,"totalTokenCount":6,"promptTokensDetails":[{"modality":"TEXT","tokenCount":5}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"KqRnas7tBa2vnsEPvd-B2QQ"}
(anonymous) @ gemini-adapter.ts:58
debate-orchestrator.ts:99 [MEMORY] Round 1 start: 58MB (2 agents)
debate-llm-caller.ts:1901 [DEBATE_FALLBACK] Calling adapter.sendMessage {provider: 'gemini', model: 'gemini-3.1-flash-lite', keyId: '00ba6b88', agentId: 'auto-ms3kdawo-12dbbaf9-4adc-4090-a1ba-ddf101c44640', msgCount: 1, …}
gemini-adapter.ts:58 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"Вы правы в том, что чрезмерная фрагментация регуляторных стандартов может создать барьеры для входа на рынок, однако это не отменяет того факта, что отсутствие четких правил игры создает рыночную неопределенность, которая сдерживает инвестиции в долгосрочные инфраструктурные проекты ИИ. \n\nКак будет происходить эффективное масштабирование капитала, если инвесторы лишены возможности хеджировать риски из-за отсутствия предсказуемой правовой среды? Вместо того чтобы рассматривать регулирование как тормоз инноваций, стоит оценить его как механизм снижения транзакционных издержек, который позволит рынку перейти от хаотичного накопления вычислительных мощностей к созданию стандартизированных, масштабируемых и безопасных экосистем.","thoughtSignature":"EjQKMgERTTIPTIXlQ0Esaefg/upaRiMN+clFbjkR/p2pb2eF/4zvoBxJSDojMNWVqWDeDetQ"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":1098,"candidatesTokenCount":170,"tot
(anonymous) @ gemini-adapter.ts:58
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:382
(anonymous) @ circuit-breaker.ts:205
(anonymous) @ circuit-breaker.ts:381
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1912
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
debate-llm-caller.ts:1922 [DEBATE_FALLBACK] adapter.sendMessage OK {provider: 'gemini', model: 'gemini-3.1-flash-lite', contentLen: 733, timestamp: 1785177144314}
gemini-adapter.ts:58 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"=== CRITIQUE ===\nТвой аргумент грешит «регуляторным оптимизмом»: ты постулируешь, что любые правила снижают транзакционные издержки, игнорируя риск «регуляторного захвата», где стандарты создаются крупными игроками для вытеснения конкурентов. Ты предлагаешь регулирование как лекарство от неопределенности, забывая, что плохо спроектированные правила создают риск невозвратных инвестиций в технологии, которые могут быть признаны незаконными уже после их внедрения.\n\n=== STRENGTHENED ===\nВы правы в том, что фрагментация создает барьеры, однако аргумент о снижении транзакционных издержек работает лишь при условии высокого качества правового дизайна. Риск заключается в том, что преждевременное регулирование может привести к «регуляторному захвату», когда стандарты формируются доминирующими корпорациями для блокировки новых игроков. Чтобы регулирование действительно стало катализатором инвестиций, а не инструментом монополизации, оно должно стро
(anonymous) @ gemini-adapter.ts:58
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:382
(anonymous) @ circuit-breaker.ts:205
(anonymous) @ circuit-breaker.ts:381
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-shadow-opponent-service.ts:66
(anonymous) @ debate-llm-caller.ts:2093
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
debate-llm-caller.ts:1901 [DEBATE_FALLBACK] Calling adapter.sendMessage {provider: 'nvidia', model: 'meta/llama-3.1-8b-instruct', keyId: '0c1925c2', agentId: 'auto-ms3kdawo-d7fc24da-6466-46f8-94f7-ffef4c22c380', msgCount: 2, …}
main.tsx:39 [Memory] heap: 71.4MB / 88.0MB
debate-llm-caller.ts:153 [MEMORY] sendMsg[auto-ms3] nvidia/meta/llama-3.1-8b-instruct: 71MB → 66MB (Δ-5MB)
debate-llm-caller.ts:1922 [DEBATE_FALLBACK] adapter.sendMessage OK {provider: 'nvidia', model: 'meta/llama-3.1-8b-instruct', contentLen: 833, timestamp: 1785177163128}
debate-persistence-manager.ts:244 [DebatePersistence] saveSnapshot version=1 for debate-ms3kdawt-42e988af-a15f-4736-b57d-5797d58faa50 phase=deliberating round=1
(anonymous) @ debate-persistence-manager.ts:244
(anonymous) @ debate-engine.ts:1149
(anonymous) @ debate-engine.ts:451
await in (anonymous)
(anonymous) @ debate-engine.ts:459
debate-orchestrator.ts:246 [MEMORY] Round 1 end: 69MB (Δ+11MB this round)
main.tsx:39 [Memory] heap: 69.1MB / 73.5MB
debate-orchestrator.ts:99 [MEMORY] Round 2 start: 69MB (2 agents)
debate-llm-caller.ts:1901 [DEBATE_FALLBACK] Calling adapter.sendMessage {provider: 'gemini', model: 'gemini-3.1-flash-lite', keyId: '00ba6b88', agentId: 'auto-ms3kdawo-12dbbaf9-4adc-4090-a1ba-ddf101c44640', msgCount: 3, …}
gemini-adapter.ts:58 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"\n\nЯ понимаю, что для тебя важно защитить конкурентную среду, потому что монополизация рынка душит инновации и ограничивает выбор конечного потребителя.\n\nДай я удостоверюсь, что правильно понял твой сильнейший аргумент: ты утверждаешь, что регулирование неизбежно создает регуляторный \"налог на соблюдение\" (compliance cost), который крупные игроки поглощают за счет эффекта масштаба, в то время как стартапы несут непропорционально высокие издержки, что ведет к консолидации рынка вокруг горстки гигантов. Я правильно тебя понял?\n\nОднако твой аргумент об \"зонах монополистической безопасности\" является неполным, так как он игнорирует экономический феномен **регуляторного арбитража**. Напротив, именно отсутствие единых стандартов создает условия, где крупные компании используют сложность юрисдикций для закрепления своего доминирования, в то время как малые игроки лишены доступа к \"юридическому капиталу\" для навигации в этом хаосе.\n\nМой
(anonymous) @ gemini-adapter.ts:58
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:382
(anonymous) @ circuit-breaker.ts:205
(anonymous) @ circuit-breaker.ts:381
(anonymous) @ priority-queue.ts:210
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-llm-caller.ts:1912
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
debate-llm-caller.ts:153 [MEMORY] sendMsg[auto-ms3] gemini/gemini-3.1-flash-lite: 71MB → 61MB (Δ-10MB)
debate-llm-caller.ts:1922 [DEBATE_FALLBACK] adapter.sendMessage OK {provider: 'gemini', model: 'gemini-3.1-flash-lite', contentLen: 2463, timestamp: 1785177186545}
gemini-adapter.ts:58 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"=== CRITIQUE ===\nТвой аргумент зиждется на идеалистическом допущении, что регуляторы способны создать «нейтральные» стандарты, не захваченные лоббизмом крупнейших игроков (regulatory capture). Ты игнорируешь исторический прецедент, где унификация правил де-факто пишется гигантами под свои существующие архитектуры, превращая «plug-and-play» в «стандарт под конкретного вендора», что окончательно вытесняет альтернативные подходы с рынка.\n\n=== STRENGTHENED ===\nЯ понимаю твою обеспокоенность тем, что стандартизация может превратиться в инструмент «захвата регулятора» (regulatory capture), где гиганты навязывают рынку свои проприетарные технологии под видом общеотраслевых стандартов. Чтобы минимизировать этот риск, я предлагаю модель **открытой стандартизации с участием open-source сообществ**, где технические требования формируются на основе интероперабельности (API-first), а не конкретных архитектурных решений.\n\nВ такой парадигме стандарты
(anonymous) @ gemini-adapter.ts:58
await in (anonymous)
(anonymous) @ base-adapter.ts:94
(anonymous) @ rate-limit-decorator.ts:155
await in (anonymous)
(anonymous) @ retry-decorator.ts:92
(anonymous) @ circuit-breaker.ts:382
(anonymous) @ circuit-breaker.ts:205
(anonymous) @ circuit-breaker.ts:381
(anonymous) @ priority-queue.ts:108
(anonymous) @ priority-queue.ts:101
(anonymous) @ priority-queue.ts:248
(anonymous) @ priority-queue.ts:225
(anonymous) @ cost-manager.ts:197
(anonymous) @ cache-decorator.ts:247
await in (anonymous)
(anonymous) @ logging-decorator.ts:24
(anonymous) @ debate-shadow-opponent-service.ts:66
(anonymous) @ debate-llm-caller.ts:2093
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
debate-llm-caller.ts:1901 [DEBATE_FALLBACK] Calling adapter.sendMessage {provider: 'nvidia', model: 'meta/llama-3.1-8b-instruct', keyId: '0c1925c2', agentId: 'auto-ms3kdawo-d7fc24da-6466-46f8-94f7-ffef4c22c380', msgCount: 3, …}
logger-service.ts:137 [18:33:22.545] INFO  [AutoDebateService] Match 1/1 OK {a=Google (ivandivandov@gmail.com)-pro, b=NVIDIA Secondary-con, durationMs=75512}
debate-persistence-manager.ts:244 [DebatePersistence] saveSnapshot version=1 for debate-ms3kdawt-42e988af-a15f-4736-b57d-5797d58faa50 phase=deliberating round=2
(anonymous) @ debate-persistence-manager.ts:244
(anonymous) @ debate-engine.ts:1149
(anonymous) @ debate-sync-manager.ts:715
(anonymous) @ debate-sync-manager.ts:648
setTimeout
(anonymous) @ debate-sync-manager.ts:646
(anonymous) @ debate-sync-manager.ts:746
(anonymous) @ event-bus.ts:444
(anonymous) @ event-bus.ts:442
(anonymous) @ event-bus.ts:266
(anonymous) @ debate-pipeline-builder.ts:221
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
debate-engine.ts:982 [cancelSession] ENTER {sessionId: 'debate-ms3kdawt-42e988af-a15f-4736-b57d-5797d58faa50', hasSession: true, activeSessions: 3}
debate-engine.ts:1007 [cancelSession] phase=deliberating, runningSessions=1
debate-engine.ts:1095 [cancelSession] active phase deliberating — aborting agents {sessionId: 'debate-ms3kdawt-42e988af-a15f-4736-b57d-5797d58faa50'}
logger-service.ts:137 [18:33:25.841] INFO  [DebatePhaseHandler] Skipping saveSnapshot for cancelled {sessionId=debate-ms3kdawt-42e988af-a15f-4736-b57d-5797d58faa50}
debate-engine.ts:1111 [cancelSession] transition done, phase=cancelled {sessionId: 'debate-ms3kdawt-42e988af-a15f-4736-b57d-5797d58faa50'}
debate-engine.ts:1119 [cancelSession] cleanup done (active path) {sessionId: 'debate-ms3kdawt-42e988af-a15f-4736-b57d-5797d58faa50', sessionsLeft: 2}
logger-service.ts:137 [18:33:25.875] INFO  [MemoryTracker] [AfterFinalize] ctx=0 sess=2 bud=2 mem=2 start=0 timeout=0 abortC=0 abortA=0 phaseC=0 run=0 preflight=0 warm=3 unsub=0 initUnsub=2 vCache=1 rSess=null actSess=0B embCh=0 polR=0 polF=0 modeV=0 strV=0 ebL=84 hist=5 livEv=0 livRd=0 livMp=0 actSess=1
logger-service.ts:134 [18:33:25.880] WARN  [EventBus] Validation failed for debate:argument {issue=Invalid input: expected string, received null}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ event-bus.ts:224
(anonymous) @ debate-sync-manager.ts:726
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:648
setTimeout
(anonymous) @ debate-sync-manager.ts:646
(anonymous) @ debate-sync-manager.ts:746
(anonymous) @ event-bus.ts:444
(anonymous) @ event-bus.ts:442
(anonymous) @ event-bus.ts:266
(anonymous) @ debate-pipeline-builder.ts:221
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
logger-service.ts:131 [18:33:25.881] ERROR [EventBus] Blocked event debate:argument - strict mode {issues=[{"expected":"string","code":"invalid_type","path":["sessionId"],"message":"Invalid input: expected string, received null"}]}
(anonymous) @ logger-service.ts:131
(anonymous) @ logger-service.ts:99
(anonymous) @ event-bus.ts:233
(anonymous) @ debate-sync-manager.ts:726
await in (anonymous)
(anonymous) @ debate-sync-manager.ts:648
setTimeout
(anonymous) @ debate-sync-manager.ts:646
(anonymous) @ debate-sync-manager.ts:746
(anonymous) @ event-bus.ts:444
(anonymous) @ event-bus.ts:442
(anonymous) @ event-bus.ts:266
(anonymous) @ debate-pipeline-builder.ts:221
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
logger.ts:20 [2026-07-27T18:33:26.636Z] ERROR [LoggingDecorator] nvidia-nim[rl][cb][pq][cost] meta/llama-3.1-8b-instruct failed after 14094ms {error: 'SessionCancelled'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
await in (anonymous)
(anonymous) @ debate-llm-caller.ts:1912
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
debate-llm-caller.ts:1929 [DEBATE_FALLBACK] adapter.sendMessage FAILED {provider: 'nvidia', model: 'meta/llama-3.1-8b-instruct', error: 'SessionCancelled', timestamp: 1785177206649}
logger-service.ts:134 [18:33:26.650] WARN  [ExecutionGovernor] Operation op-ms3kepgb-4 failed {type=debate, error=SessionCancelled}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
fail @ execution-governor.ts:80
(anonymous) @ debate-llm-caller.ts:1935
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
quality-impact-collector.ts:506 
[QualityImpact] Session debate-ms3kdawt-42e988af-a15f-4736-b57d-5797d58faa50: 6 techniques
quality-impact-collector.ts:511   response-features: +0.0% (n=3, 1 sessions, p=1.0000, none)
quality-impact-collector.ts:511   shadow-opponent: +0.0% (n=3, 1 sessions, p=1.0000, none)
quality-impact-collector.ts:511   entanglement: +0.0% (n=2, 1 sessions, p=1.0000, none)
quality-impact-collector.ts:511   steelman: +0.0% (n=2, 1 sessions, p=1.0000, none)
quality-impact-collector.ts:511   fact-checking: +0.0% (n=2, 1 sessions, p=1.0000, none)
quality-impact-collector.ts:511   consistency-check: +0.0% (n=1, 1 sessions, p=1.0000, none)
debate-orchestrator.ts:246 [MEMORY] Round 2 end: 139MB (Δ+70MB this round)
main.tsx:39 [Memory] heap: 139.4MB / 147.4MB
logger-service.ts:134 [18:33:30.072] WARN  [DebateSyncManager] Skipping finalize — runtimeSessionId changed {expected=debate-ms3kdawt-42e988af-a15f-4736-b57d-5797d58faa50}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-sync-manager.ts:432
setTimeout
(anonymous) @ debate-pipeline-builder.ts:297
(anonymous) @ debate-pipeline-builder.ts:296
await in (anonymous)
(anonymous) @ debate-pipeline.ts:23
logger-service.ts:137 [18:33:32.559] INFO  [MemoryTracker] [TournamentMatch1] embCh=0 polR=0 polF=0 modeV=0 strV=0 ebL=84 hist=0 livEv=1 livRd=1 livMp=1 actSess=1
main.tsx:39 [Memory] heap: 70.7MB / 73.1MB
main.tsx:45 [Memory] Still alive after 5 minutes
main.tsx:39 [Memory] heap: 71.2MB / 73.9MB
main.tsx:39 [Memory] heap: 71.1MB / 72.6MB
main.tsx:39 [Memory] heap: 71.1MB / 72.6MB
main.tsx:39 [Memory] heap: 62.6MB / 64.7MB
main.tsx:39 [Memory] heap: 71.5MB / 72.9MB
main.tsx:39 [Memory] heap: 70.2MB / 73.6MB
