react-dom_client.js?v=9326f852:14338 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
logger-service.ts:137 [16:48:36.098] INFO  [DatabaseService] No clean shutdown flag — possible crash, running integrity scan
logger-service.ts:137 [16:48:36.107] INFO  [DatabaseService] Migration v5→v6: table 'keyValue' indexes changed: [id] → [id, createdAt]
logger-service.ts:137 [16:48:36.107] INFO  [DatabaseService] Migration v10→v11: table 'debateSessions' indexes changed: [id, phase, updatedAt] → [id, phase, updatedAt, topic, folder, isArchived]
logger-service.ts:137 [16:48:36.109] INFO  [DatabaseService] Integrity auto-scan started {intervalMs=1800000}
logger-service.ts:137 [16:48:36.109] INFO  [Runtime] Storage initialized {hasStorageLayer=true, hasKeys=true, keysType=object, hasListKeys=true, storageBackend=dexie}
logger-service.ts:137 [16:48:36.110] INFO  [Bootstrap] Initializing Super-Agents OS Runtime...
logger-service.ts:137 [16:48:36.110] INFO  [Phase0EventBridge] EventBridge initialized
phase1-foundation.ts:55 [KEY_FLOW] keyStore implementation type: Object
logger-service.ts:137 [16:48:36.112] INFO  [ExperimentEngine] init {count=0}
logger-service.ts:134 [16:48:36.118] WARN  [CompromiseWebhook] Webhook secret not configured — compromise detection is DISABLED. Set CONFIG.security.webhookSecret to enable.
(anonymous) @ logger-service.ts:134
logger-service.ts:137 [16:48:36.154] INFO  [DexieIdentity] [DEXIE_ANCHOR] first anchor set {source=database-service:singleton, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=0}
logger-service.ts:137 [16:48:36.163] INFO  [KeyMigration] No keys found — marking migration as done
logger-service.ts:137 [16:48:36.163] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=bootstrap:step3, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=0, timestamp=1785170916163}
logger-service.ts:137 [16:48:36.164] INFO  [DatabaseService] Startup integrity scan: all tables clean
logger-service.ts:137 [16:48:36.164] INFO  [Bootstrap] Snapshot repo count {count=0}
bootstrap-key-init.ts:66 [BOOTSTRAP_SNAPSHOT_RAW] dexie count: 0
bootstrap-key-init.ts:133 [BOOTSTRAP_SNAPSHOT_FINAL] count: 0
bootstrap-key-init.ts:134 [BOOTSTRAP_SNAPSHOT_SOURCE] unknown
logger-service.ts:137 [16:48:36.168] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=key-storage-hydrator:start, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=0, timestamp=1785170916168}
logger-service.ts:137 [16:48:36.169] INFO  [KeyStorageHydrator] dexieKeys.length = 0 from instance [object Object]
key-registry.ts:179 [KEY_REGISTRY_OVERWRITE] Object
(anonymous) @ key-registry.ts:179
(anonymous) @ key-service.ts:418
(anonymous) @ key-storage-hydrator.ts:54
key-registry.ts:192 [KEY_REGISTRY] reload() no-op during bootstrap phase
logger-service.ts:137 [16:48:36.225] INFO  [DexieIdentity] [DEXIE_IDENTITY_WITH_COUNT] {source=KeyRegistry.loadKeys, instanceRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], sameAsGlobalThis=true, globalRef=SuperAgentsDB[super_agents_os_v4, tables=0, ], apiKeysCount=0, timestamp=1785170916225}
logger-service.ts:137 [16:48:36.225] INFO  [KeyRegistry] [KEY_TRACE] loadDexie: 0 {sample=[], source=repo.getAll()}
logger-service.ts:137 [16:48:36.225] INFO  [KeyRegistry] [KEY_TRACE] normalize.map: 0 {sample=[]}
logger-service.ts:137 [16:48:36.225] INFO  [KeyRegistry] Filtered keys count: {count=0}
logger-service.ts:137 [16:48:36.225] INFO  [KeyRegistry] [KEY_TRACE] filterValid: 0 {sample=[]}
logger-service.ts:137 [16:48:36.225] INFO  [KeyRegistry] [KEY_TRACE] decrypt: 0 {sample=[]}
logger-service.ts:137 [16:48:36.226] INFO  [KeyRegistry] [KEY_TRACE] assign: 0 {sample=[]}
key-registry.ts:440 [KEY_SYNC] final committed count: 0
key-service.ts:258 [KEY_FLOW] KeyService final keys count: Object
logger-service.ts:137 [16:48:36.245] INFO  [SchedulerService] Scheduler started
logger-service.ts:137 [16:48:36.245] INFO  [SchedulerService] Initialized with 0 schedules
logger-service.ts:137 [16:48:36.246] INFO  [Orchestrator] Mounted topology: Agent Workforce (v2.0.0)
logger-service.ts:137 [16:48:36.257] INFO  [Bootstrap] Group Manager synced existing keys
logger-service.ts:137 [16:48:36.257] INFO  [Bootstrap] DebateService initialized
logger-service.ts:137 [16:48:36.257] INFO  [Bootstrap] MemoryWatchdog pressure callbacks registered
logger-service.ts:137 [16:48:36.258] INFO  [CrossTabStateSync] Initialized with BroadcastChannel {tabId=ms3go6ik-9928ff3f-34af-4858-bf9d-2cb407a6e1ad}
main.tsx:39 [Memory] heap: 52.0MB / 62.7MB
logger-service.ts:137 [16:49:22.918] INFO  [DebateSyncManager] Starting debate {topic=массового получения воды из воздуха в прибрежной зоне города Ашдода, participants=10, strategy=round_robin, maxRounds=3}
DebatePanel.tsx:470 DEBATE START ERROR: Error: No active API keys available
    at checkDebatePreflight (debate-preflight.ts:10:40)
    at DebateSyncManager.startDebate (debate-sync-manager.ts:223:9)
    at handleStart (DebatePanel.tsx:455:49)
    at executeDispatch (react-dom_client.js?v=9326f852:9141:5)
    at runWithFiberInDEV (react-dom_client.js?v=9326f852:851:66)
    at processDispatchQueue (react-dom_client.js?v=9326f852:9167:27)
    at react-dom_client.js?v=9326f852:9454:5
    at batchedUpdates$1 (react-dom_client.js?v=9326f852:2044:12)
    at dispatchEventForPluginEventSystem (react-dom_client.js?v=9326f852:9240:4)
    at dispatchEvent (react-dom_client.js?v=9326f852:11319:29)
(anonymous) @ DebatePanel.tsx:470
main.tsx:39 [Memory] heap: 68.6MB / 77.6MB
proxy/gemini/v1beta/models:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
llm-http-client.ts:301 [Gemini] GET 400 body: {
  "error": {
    "code": 400,
    "message": "API key not valid. Please pass a valid API key.",
    "status": "INVALID_ARGUMENT",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "API_KEY_INVALID",
        "domain": "googleapis.com",
        "metadata": {
          "service": "generativelanguage.googleapis.com"
        }
      },
      {
        "@type": "type.googleapis.com/google.rpc.LocalizedMessage",
        "locale": "en-US",
        
(anonymous) @ llm-http-client.ts:301
logger.ts:20 [2026-07-27T16:49:47.932Z] WARN [GeminiHealth] getAvailableModels failed Object
formatLog @ logger.ts:20
logger.ts:20 [2026-07-27T16:49:47.932Z] WARN [GeminiHealth] checkHealth failed Object
formatLog @ logger.ts:20
main.tsx:39 [Memory] heap: 111.9MB / 201.2MB
group-manager.ts:365 [GroupManager] cleaned 1 orphan keyIds from group "Default"
main.tsx:39 [Memory] heap: 67.9MB / 202.7MB
logger-service.ts:137 [16:50:38.542] INFO  [DebateSyncManager] Starting debate {topic=массового получения воды из воздуха в прибрежной зоне города Ашдода, participants=10, strategy=round_robin, maxRounds=3}
router-debate-selector.ts:75 [DEBATE_FALLBACK] getDebateProviders primary pass Object
router-debate-selector.ts:128 [DEBATE_FALLBACK] getDebateProviders active after filter Object
proxy/openrouter/api/v1/chat/completions:1  Failed to load resource: the server responded with a status of 402 (Payment Required)
logger.ts:20 [2026-07-27T16:50:39.574Z] ERROR [LoggingDecorator] openrouter[rl][cb][pq][cost] meta-llama/llama-3.1-8b-instruct failed after 541ms Object
formatLog @ logger.ts:20
logger-service.ts:134 [16:50:39.574] WARN  [DebateEngine] preflight: openrouter/meta-llama/llama-3.1-8b-instruct auth error — marking provider failed
(anonymous) @ logger-service.ts:134
gemini-adapter.ts:58 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"OK","thoughtSignature":"EjQKMgERTTIPActcP3UiVmuBHHJIWwrQAKMROzAjeg9/8gaymGmfSSO+6+yzSXsLc7WXaj/5"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":1,"totalTokenCount":6,"promptTokensDetails":[{"modality":"TEXT","tokenCount":5}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-lite","responseId":"X4xnaqeFC_WFnsEPsKTzyAg"}
(anonymous) @ gemini-adapter.ts:58
debate-persistence-manager.ts:244 [DebatePersistence] saveSnapshot version=1 for debate-ms3gqszz-ef5c4095-38d1-4906-bf1a-82be416a1222 phase=active round=0
(anonymous) @ debate-persistence-manager.ts:244
(anonymous) @ debate-engine.ts:1149
(anonymous) @ debate-engine.ts:451
(anonymous) @ debate-engine.ts:459
logger.ts:20 [2026-07-27T16:51:04.049Z] ERROR [LoggingDecorator] nvidia-nim[rl][cb][pq][cost] meta/llama-3.1-8b-instruct failed after 25016ms {error: 'PreflightTimedOut'}
formatLog @ logger.ts:20
(anonymous) @ logger.ts:37
(anonymous) @ logging-decorator.ts:32
logger-service.ts:134 [16:51:04.050] WARN  [DebateEngine] preflight: nvidia/meta/llama-3.1-8b-instruct timed out (25000ms) — skipping remaining models, same endpoint
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-engine.ts:395
logger-service.ts:134 [16:51:04.050] WARN  [DebateEngine] preflight: nvidia — all models failed, marking provider unavailable
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-engine.ts:413
debate-orchestrator.ts:99 [MEMORY] Round 1 start: 67MB (10 agents)
debate-llm-caller.ts:1900 [DEBATE_FALLBACK] Calling adapter.sendMessage {provider: 'gemini', model: 'gemini-3.1-flash-lite', keyId: 'f6274640', agentId: 'agent-architect', msgCount: 1, …}
main.tsx:39 [Memory] heap: 75.3MB / 81.9MB
gemini-adapter.ts:58 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"Вы правы в том, что использование технологий сбора воды из атмосферы в Ашдоде может снизить локальную нагрузку на системы водоснабжения, однако это не отменяет того факта, что экономическая эффективность данного метода в сравнении с промышленным опреснением морской воды остается крайне низкой из-за высокой энергоемкости на единицу объема.\n\nКак специалист, я задаюсь вопросом: целесообразно ли инвестировать в масштабирование энергозатратных технологий извлечения влаги в условиях высокой влажности прибрежной зоны, если текущие затраты на поддержание инфраструктуры опреснения уже оптимизированы за счет эффекта масштаба? Не создает ли чрезмерная фрагментация источников водоснабжения избыточных капитальных затрат, которые в долгосрочной перспективе лишь замедлят необходимый переход города к модели энергетически нейтрального водного цикла?","thoughtSignature":"EjQKMgERTTIPTvHZPkaUEvY7vhzHwHBRG6i8IhAQZf+OLNmncTCexkhWY0LlzNd+nP0ApAcZ"}],"role":"mod
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
(anonymous) @ debate-llm-caller.ts:1911
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
debate-llm-caller.ts:1921 [DEBATE_FALLBACK] adapter.sendMessage OK {provider: 'gemini', model: 'gemini-3.1-flash-lite', contentLen: 844, timestamp: 1785171067334}
gemini-adapter.ts:58 [GeminiAdapter] response for gemini-3.1-flash-lite: {"candidates":[{"content":{"parts":[{"text":"=== CRITIQUE ===\nТвой аргумент ошибочно исходит из предпосылки, что «фрагментация» источников — это априори минус, игнорируя риски централизации. Ты полностью упускаешь фактор критической уязвимости инфраструктуры опреснения перед лицом техногенных или военных угроз, где распределенная сеть сбора воды является не экономической обузой, а единственным инструментом обеспечения жизнестойкости города.\n\n=== STRENGTHENED ===\nВы правы в том, что использование технологий сбора воды из атмосферы в Ашдоде значительно уступает промышленному опреснению в операционной эффективности и масштабируемости. Однако, рассматривая исключительно экономический показатель стоимости единицы объема, мы совершаем ошибку «эффективности в мирное время», игнорируя риски системного отказа централизованных опреснительных мощностей. В условиях прибрежной зоны Ашдода, подверженной специфическим угрозам, создание распределенной сети атмосферных генераторов должно рассматрив
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
(anonymous) @ debate-llm-caller.ts:2092
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
debate-llm-caller.ts:1900 [DEBATE_FALLBACK] Calling adapter.sendMessage {provider: 'groq', model: 'llama-3.3-70b-versatile', keyId: '409ad81d', agentId: 'agent-critic', msgCount: 2, …}
debate-persistence-manager.ts:244 [DebatePersistence] saveSnapshot version=1 for debate-ms3gqszz-ef5c4095-38d1-4906-bf1a-82be416a1222 phase=deliberating round=1
(anonymous) @ debate-persistence-manager.ts:244
(anonymous) @ debate-engine.ts:1149
(anonymous) @ debate-engine.ts:451
(anonymous) @ debate-engine.ts:459
debate-llm-caller.ts:153 [MEMORY] sendMsg[agent-cr] groq/llama-3.3-70b-versatile: 86MB → 73MB (Δ-13MB)
debate-llm-caller.ts:1921 [DEBATE_FALLBACK] adapter.sendMessage OK {provider: 'groq', model: 'llama-3.3-70b-versatile', contentLen: 1386, timestamp: 1785171074389}
router-debate-selector.ts:75 [DEBATE_FALLBACK] getDebateProviders primary pass {totalKeys: 17, activeCount: 17, activeProviders: Array(17), skippedAuth: Array(0)}
router-debate-selector.ts:128 [DEBATE_FALLBACK] getDebateProviders active after filter {fallbackUsed: 17, providers: Array(17)}
debate-query-engine.ts:334 [DEBATE_FALLBACK] Step 4: getDebateProviders(1) {count: 4, providers: Array(4)}
debate-query-engine.ts:350 [DEBATE_FALLBACK] Step 4: found provider {provider: 'groq', keyId: '409ad81d'}
debate-llm-caller.ts:1900 [DEBATE_FALLBACK] Calling adapter.sendMessage {provider: 'groq', model: 'llama-3.3-70b-versatile', keyId: '409ad81d', agentId: 'agent-data', msgCount: 3, …}
debate-llm-caller.ts:1921 [DEBATE_FALLBACK] adapter.sendMessage OK {provider: 'groq', model: 'llama-3.3-70b-versatile', contentLen: 1386, timestamp: 1785171082556}
logger-service.ts:134 [16:51:22.563] WARN  [DebateLlmCaller] Response rejected — cross-agent duplicate {agentId=agent-data, provider=groq, model=llama-3.3-70b-versatile, keyId=409ad81d, rejectCount=1, maxRejects=3, preview=Я понимаю озабоченность моего оппонента по поводу экономической эффективности технологий сбора воды из атмосферы в сравн}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:1949
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:1900 [DEBATE_FALLBACK] Calling adapter.sendMessage {provider: 'groq', model: 'llama-3.1-8b-instant', keyId: '409ad81d', agentId: 'agent-data', msgCount: 3, …}
 [MEMORY] sendMsg[agent-da] groq/llama-3.1-8b-instant: 87MB → 81MB (Δ-6MB)
 [DEBATE_FALLBACK] adapter.sendMessage OK {provider: 'groq', model: 'llama-3.1-8b-instant', contentLen: 756, timestamp: 1785171085813}
 [16:51:25.816] WARN  [DebateLlmCaller] Response rejected — entanglement validation {agentId=agent-data, reason=no_explicit_reference_to_opponent, low_term_overlap_with_target, targetAgent=Climate Scientist / Климатолог}
 [16:51:25.819] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.820] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.821] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.821] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.822] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.823] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.824] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.824] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.826] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.827] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.828] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.829] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.831] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.831] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.832] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.833] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.834] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.834] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.835] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.835] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.837] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.838] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.839] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.839] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.840] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.841] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.842] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.843] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.844] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.845] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.846] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.847] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.848] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.849] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.850] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.850] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.852] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.852] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.854] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.855] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.857] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.857] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.859] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.859] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.860] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.861] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.863] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.863] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.864] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.865] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.866] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.866] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.867] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.867] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.868] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.868] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.869] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.870] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.870] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.871] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.872] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.872] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.873] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.874] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.875] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.875] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.876] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.877] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.878] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.879] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.880] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.880] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.881] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.882] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.883] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.883] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.884] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.885] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.885] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.886] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.887] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.887] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.888] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.888] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.889] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.890] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.891] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.891] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.892] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.893] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.894] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.898] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.899] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.900] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.900] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.901] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.902] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.902] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.903] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.903] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.904] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.904] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.905] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.905] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.906] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.906] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.907] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.907] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.908] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.908] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.909] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.910] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.911] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.912] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.913] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
logger-service.ts:134 [16:51:25.913] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-llm-caller.ts:401
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
logger-service.ts:134 [16:51:25.914] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
(anonymous) @ logger-service.ts:134
(anonymous) @ logger-service.ts:95
(anonymous) @ debate-query-engine.ts:497
(anonymous) @ debate-llm-caller.ts:355
await in (anonymous)
(anonymous) @ debate-engine.ts:904
(anonymous) @ debate-engine.ts:799
(anonymous) @ debate-pipeline-builder.ts:125
(anonymous) @ debate-agent-executor.ts:72
await in (anonymous)
(anonymous) @ debate-orchestrator.ts:177
(anonymous) @ debate-pipeline-builder.ts:156
debate-llm-caller.ts:396 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.915] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.915] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.916] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.917] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.918] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.918] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.919] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.920] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.920] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.921] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.921] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.922] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.923] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.924] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.925] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.927] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.928] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.929] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.930] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.931] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.932] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.933] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.933] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.934] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.934] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.935] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.936] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.936] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.937] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.938] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.938] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.939] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.940] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.941] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.942] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.943] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.945] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.948] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.952] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.957] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.959] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.960] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.961] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.964] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.967] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.975] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.976] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.978] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.978] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.981] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.983] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.987] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.990] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.992] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.993] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.994] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.995] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:25.997] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:25.999] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.000] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.001] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.002] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.002] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.003] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.004] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.004] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.005] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.006] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.006] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.007] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.007] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.008] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.008] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.009] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.009] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.010] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.011] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.014] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.016] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.021] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.024] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.025] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.026] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.027] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.028] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.031] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.033] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.038] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.041] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.043] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.043] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.045] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.046] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.048] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.050] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.051] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.052] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.053] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.054] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.055] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.056] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.057] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.058] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.059] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.059] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.060] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.062] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.066] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.069] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.073] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.075] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.076] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.077] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.078] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.081] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.087] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.090] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.092] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.092] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.094] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.094] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.096] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.099] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.103] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.107] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.109] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.110] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.111] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.112] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.115] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.117] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.122] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.125] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.126] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.127] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.129] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.129] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.132] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.133] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.134] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.135] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.136] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.137] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.138] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.139] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.140] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.141] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.142] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.143] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.144] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.145] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.147] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.147] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.149] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.150] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.151] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.151] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.153] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.154] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.155] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.155] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.156] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.157] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.158] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.159] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.160] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.162] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.165] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.167] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.172] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.174] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.176] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.176] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.178] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.178] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.181] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.183] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.188] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.191] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.192] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.193] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.195] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.197] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.202] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.206] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.208] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.209] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.210] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.211] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.214] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.216] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.221] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.224] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.225] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.226] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.227] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.227] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.229] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.231] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.235] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.238] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.242] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.243] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.244] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.244] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.245] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.248] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.252] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.255] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.258] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.259] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.260] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.261] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.263] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.265] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.270] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.273] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.276] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.276] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.278] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.279] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.280] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.283] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.284] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.285] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.286] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.287] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.288] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.289] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.290] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.292] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.293] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.294] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.295] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.297] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.301] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.304] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.308] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.308] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.309] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.310] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.312] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.315] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.319] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.323] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.326] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.327] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.328] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.330] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.335] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.338] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.342] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.342] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.351] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.352] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.353] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.354] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.355] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.356] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.357] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.358] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.359] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.359] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.360] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.361] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.363] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.366] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.370] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.373] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.375] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.376] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.378] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.379] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.381] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.383] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.388] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.391] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.393] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.394] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.395] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.396] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.398] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.400] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.402] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.402] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.403] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.404] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.406] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.407] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.408] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.408] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.409] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.410] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.412] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.413] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.419] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.422] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.425] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.426] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.427] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.428] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.431] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.433] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.437] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.440] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.443] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.445] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.447] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.449] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.451] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.452] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.454] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.455] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.456] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.457] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.458] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.459] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.460] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.461] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.464] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.467] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.473] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.475] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.477] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.478] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.481] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.483] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.488] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.491] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.493] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.494] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.495] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.496] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.499] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.501] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.502] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.503] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.504] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.505] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.506] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.507] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.508] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.509] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.511] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.512] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.515] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.517] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.521] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.524] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.526] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.527] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.528] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.529] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.531] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.533] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.538] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.540] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.542] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.543] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.545] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.545] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.547] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.549] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.551] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.552] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.553] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.554] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.555] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.556] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.557] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.558] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.559] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.560] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.561] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.562] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.566] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.571] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.574] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.575] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.576] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.578] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.579] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.582] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.587] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.590] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.593] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.594] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.595] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.598] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.602] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.605] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.609] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.610] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.611] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.612] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.615] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.617] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.618] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.618] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.619] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.619] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.621] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.621] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.622] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.623] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.625] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.626] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.627] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.628] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.629] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.630] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.631] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.632] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.633] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.634] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.636] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.636] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.638] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.638] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.640] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.641] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.642] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.642] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.643] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.644] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.645] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.646] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.650] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.653] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.658] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.659] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.661] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.662] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.663] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.666] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.670] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.674] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.677] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.678] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.680] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.684] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.685] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.686] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.687] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.688] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.689] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.690] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.691] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.692] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.693] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.695] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.697] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.700] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.705] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.707] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.709] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.711] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.713] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.715] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.718] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.721] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.726] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.728] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.730] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.731] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.732] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.733] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.734] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.735] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.737] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.739] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.741] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.742] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.743] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.744] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.746] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.748] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.751] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.754] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.758] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.759] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.760] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.763] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.771] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.775] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.786] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.790] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.794] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.795] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.802] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.804] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.811] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.812] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.814] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.815] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.816] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.818] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.820] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.821] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.822] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.823] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.824] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.825] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.826] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.828] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.830] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.831] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.834] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.836] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.837] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.838] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.840] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.841] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.842] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.843] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.844] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.849] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.856] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.859] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.863] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.864] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.868] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.872] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.877] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.878] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.879] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.880] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.882] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.884] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.887] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.888] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.889] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.890] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.891] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.892] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.893] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.894] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.898] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.900] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.902] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.905] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.909] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.911] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.912] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.913] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.917] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.919] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.924] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.926] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.928] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.929] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.931] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.933] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.938] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.941] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.945] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.946] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.947] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.949] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.952] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.953] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.955] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.955] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.957] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.958] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.959] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.960] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.963] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.966] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.970] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.974] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.979] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.980] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.983] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.986] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.991] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.994] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:26.996] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:26.997] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.000] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.000] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.001] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.002] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.003] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.004] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.005] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.005] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.007] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.008] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.009] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.010] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.011] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.012] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.016] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.019] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.024] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.025] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.026] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.028] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.033] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.037] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.042] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.042] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.044] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.046] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.050] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.053] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.058] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.059] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.060] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.061] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.062] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.064] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.067] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.071] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.075] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.075] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.076] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.077] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.079] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.080] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.084] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.087] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.091] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.092] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.093] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.095] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.096] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.098] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.102] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.106] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.109] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.110] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.111] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.112] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.113] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.115] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.117] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.118] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.119] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.120] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.122] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.122] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.124] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.124] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.125] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.126] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.129] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.132] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.137] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.140] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.142] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.143] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.145] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.146] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.150] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.154] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.158] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.159] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.160] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.161] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.162] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.163] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.166] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.167] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.168] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.169] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.170] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.171] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.172] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.173] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.173] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.174] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.175] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.175] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.176] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.177] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.178] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.180] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.184] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.188] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.192] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.192] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.194] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.194] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.196] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.198] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.203] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.206] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.209] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.210] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.211] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.212] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.215] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.217] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.222] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.224] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.226] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.227] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.228] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.230] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.233] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.237] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.249] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.250] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.252] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.252] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.253] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.254] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.256] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.256] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.257] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.258] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.259] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.259] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.260] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.261] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.262] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.264] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.266] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.272] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.274] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.274] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.275] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.276] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.277] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.277] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.279] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.279] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.281] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.283] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.284] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.284] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.285] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.285] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.286] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.286] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.287] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.287] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.288] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.289] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.289] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.290] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.291] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.291] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.292] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.293] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.294] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.294] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.295] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.296] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.300] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.302] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.306] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.307] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.308] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.309] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.310] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.311] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.313] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.314] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.357] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.359] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.360] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.361] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.363] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.364] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.368] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.371] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.375] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.376] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.377] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.378] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.380] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.381] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.384] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.384] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.385] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.386] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.387] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.387] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.388] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.389] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.390] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.391] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.392] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.392] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.393] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.394] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.397] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.400] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.404] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.407] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.409] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.410] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.411] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.412] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.415] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.417] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.423] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.425] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.427] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.428] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.432] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.435] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.441] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.443] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.444] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.445] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.447] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.450] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.454] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.457] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.459] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.460] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.462] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.463] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.466] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.469] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.474] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.476] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.477] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.479] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.480] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.482] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.484] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.484] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.485] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.486] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.487] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.488] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.489] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.490] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.491] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.491] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.492] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.493] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.494] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.496] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.499] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.501] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.505] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.508] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.510] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.511] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.512] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.514] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.518] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.521] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.526] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.526] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.528] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.530] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.533] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.538] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.542] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.543] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.544] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.545] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.547] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.549] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.554] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.557] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.559] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.560] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.561] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.562] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.563] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.567] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.568] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.569] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.570] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.570] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.571] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.572] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.573] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.574] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.575] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.575] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.576] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.579] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.585] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.589] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.592] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.593] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.594] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.595] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.600] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.604] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.612] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.616] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.621] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.624] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.626] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.627] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.630] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.633] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.638] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.641] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.643] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.643] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.645] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.646] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.648] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.650] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.652] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.652] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.653] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.654] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.655] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.656] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.658] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.659] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.659] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.660] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.661] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.662] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.666] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.668] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.672] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.674] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.676] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.677] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.679] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.688] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.692] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.693] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.695] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.697] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.702] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.705] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.709] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.710] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.711] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.711] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.713] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.716] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.720] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.724] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.726] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.726] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.729] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.730] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.733] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.737] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.742] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.743] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.744] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.745] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.748] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.750] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.754] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.757] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.760] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.760] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.762] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.763] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.767] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.771] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.776] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.776] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.778] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.779] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.781] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.783] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.785] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.786] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.787] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.788] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.789] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.790] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.792] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.792] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.794] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.795] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.798] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.800] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.805] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.808] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.810] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.811] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.815] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.816] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.819] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.822] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.826] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.828] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.831] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.831] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.833] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.835] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.836] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.837] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.838] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.839] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.840] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.841] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.842] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.842] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.844] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.846] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.848] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.850] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.855] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.858] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.860] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.863] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.864] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.866] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.870] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.873] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.880] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.881] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.884] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.884] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.885] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.886] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.887] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.887] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.888] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.889] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.890] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.891] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.892] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.893] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.894] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.895] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.898] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.900] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.904] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.907] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.909] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.910] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.911] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.912] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.913] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.914] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.917] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.919] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.924] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.927] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.929] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.930] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.933] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.935] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.937] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.938] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.939] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.940] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.941] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.942] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.943] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.944] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.946] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.949] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.951] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.951] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.952] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.953] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.955] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.955] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.956] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.957] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.959] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.959] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.962] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.963] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.966] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.967] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.969] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.969] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.971] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.972] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.973] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.973] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.974] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.975] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.976] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.976] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.977] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.979] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.982] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.985] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.989] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:27.994] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:27.998] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.000] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.002] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.004] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.009] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.015] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.017] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.018] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.022] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.022] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.024] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.025] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.026] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.026] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.027] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.028] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.030] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.030] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.033] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.034] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.035] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.036] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.037] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.038] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.039] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.040] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.041] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.041] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.042] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.042] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.043] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.044] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.046] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.048] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.050] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.051] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.052] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.053] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.054] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.054] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.056] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.056] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.057] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.058] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.059] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.060] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.067] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.068] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.069] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.069] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.070] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.070] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.071] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.072] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.074] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.074] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.075] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.075] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.076] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.076] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.077] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.077] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.078] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.079] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.079] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.080] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.082] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.083] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.086] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.087] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.091] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.095] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.097] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.098] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.101] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.101] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.102] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.102] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.103] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.104] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.104] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.105] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.105] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.106] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.107] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.107] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.108] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.108] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.109] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.110] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.111] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.112] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.112] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.113] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.114] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.114] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.115] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.115] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.116] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.116] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.117] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.118] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.119] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.119] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.120] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.120] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.121] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.121] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.122] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.122] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.123] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.124] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.124] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.125] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.125] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.126] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.127] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.127] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.129] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.130] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.130] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.131] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.131] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.132] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.133] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.134] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.134] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.135] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.135] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.136] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.136] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.137] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.137] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.138] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.138] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.139] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.139] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.140] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.141] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.141] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.142] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.142] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.143] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.145] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.146] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.146] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.147] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.148] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.148] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.149] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.149] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.150] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.151] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.151] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.152] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.152] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.153] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.153] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.154] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.154] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.155] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.155] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.156] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.156] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.157] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.158] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.158] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.158] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.159] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.159] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.160] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.161] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.162] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.162] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.163] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.164] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.164] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.165] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.166] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.166] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.167] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.167] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.168] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.168] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.169] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.169] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.170] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.170] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.171] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.171] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.172] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.172] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.173] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.174] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.175] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.175] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.176] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.177] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.178] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.179] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.180] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.180] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.181] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.182] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.182] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.183] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.183] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.184] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.184] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.185] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.185] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.185] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.186] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.186] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.187] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.187] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.188] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.188] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.189] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.189] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.190] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.190] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.191] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.191] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.192] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.192] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.193] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.193] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.194] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.195] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.196] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.196] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.197] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.198] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.199] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.199] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.200] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.200] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.200] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.201] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.202] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.202] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.203] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.203] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.204] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.204] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.205] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.205] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.205] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.206] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.207] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.207] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.208] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.208] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.209] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.209] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.210] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.210] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.211] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.211] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.212] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.212] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.213] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.214] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.215] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.215] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.216] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.216] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.217] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.217] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.218] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.219] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.219] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.220] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.220] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.221] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.221] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.222] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.222] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.223] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.223] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.224] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.224] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.225] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.225] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.226] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.226] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.227] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.228] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.228] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.229] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.230] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.231] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.231] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.232] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.232] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.233] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.233] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.233] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.234] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.234] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.235] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.235] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.236] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.237] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.237] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.238] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.238] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.239] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.239] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.240] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.240] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.241] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.242] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.242] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.243] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.243] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.244] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.245] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.246] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.247] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.247] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.248] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.248] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.249] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.249] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.250] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.251] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.251] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.252] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.252] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.253] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.253] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.254] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.254] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.255] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.256] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.256] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.257] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.257] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.258] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.258] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.259] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.259] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.260] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.260] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.261] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.262] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.262] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.263] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.264] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.264] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.265] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.265] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.266] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.266] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.267] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.267] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.268] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.269] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.270] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.270] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.271] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.273] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.274] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.274] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.275] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.276] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.276] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.277] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.278] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.279] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.281] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.281] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.282] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.283] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.283] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.284] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.285] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.285] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.286] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.287] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.287] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.288] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.288] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.289] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.290] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.290] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.291] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.292] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.292] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.293] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.293] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.294] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.295] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.296] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.297] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.297] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.298] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.299] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.299] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.300] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.301] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.301] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.302] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.303] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.303] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.304] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.305] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.305] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.306] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.307] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.307] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.308] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.308] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.309] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.309] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.310] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.311] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.312] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.313] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.315] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.317] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.341] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.342] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.343] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.343] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.344] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.345] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.345] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.346] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.348] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.351] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.353] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.356] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.358] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.358] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.359] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.360] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.360] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.384] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.385] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.386] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.386] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.387] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.387] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.388] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.389] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.389] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.390] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.391] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.392] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.392] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.393] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.394] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.394] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.395] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.396] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.397] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.398] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.400] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.401] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.402] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.402] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.403] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.404] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.405] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.405] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.411] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.414] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.416] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.417] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.421] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.424] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.426] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.427] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.430] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.432] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.435] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.438] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.441] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.442] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.443] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.444] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.445] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.445] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.446] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.447] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.448] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.450] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.454] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.457] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.459] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.460] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.460] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.462] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.463] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.465] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.467] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.469] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.472] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.474] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.476] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.476] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.477] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.477] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.478] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.479] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.480] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.481] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.483] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.484] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.485] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.485] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.486] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.486] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.487] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.487] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.489] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.489] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.490] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.491] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.492] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.492] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.493] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.493] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.495] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.496] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.498] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.500] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.502] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.504] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.508] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.510] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.512] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.512] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.513] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.515] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.518] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.521] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.524] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.525] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.528] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.528] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.529] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.530] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.532] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.534] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.534] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.535] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.536] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.536] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.537] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.537] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.538] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.539] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.539] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.540] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.540] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.541] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.542] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.542] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.543] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.543] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.544] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.545] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.546] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.548] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.551] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.554] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.556] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.558] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.558] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.559] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.560] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.560] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.563] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.565] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.569] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.572] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.575] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.576] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.577] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.578] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.579] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.580] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.581] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.583] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.584] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.586] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.589] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.592] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.595] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.597] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.598] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.599] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.600] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.602] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.602] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.603] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.604] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.604] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.605] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.605] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.606] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.607] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.608] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.608] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.609] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.609] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.610] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.610] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.612] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.613] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.614] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.614] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.615] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.615] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.616] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.617] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.618] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.618] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.619] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.619] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.620] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.621] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.622] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.623] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.625] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.625] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.626] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.626] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.627] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.627] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.629] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.630] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.631] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.633] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.636] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.639] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.642] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.643] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.644] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.644] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.645] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.646] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.647] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.649] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.651] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.654] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.656] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.658] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.659] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.659] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.660] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.662] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.663] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.663] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.664] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.666] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.668] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.668] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.669] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.669] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.670] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.670] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.671] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.671] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.672] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.673] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.673] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.674] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.674] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.675] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.675] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.676] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.676] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.677] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.678] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.679] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.681] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.683] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.687] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.689] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.691] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.691] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.692] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.692] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.693] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.694] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.695] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.696] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.697] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.698] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.700] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.704] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.707] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.709] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.710] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.712] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.712] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.713] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.715] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.716] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.720] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.723] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.724] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.725] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.726] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.726] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.727] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.727] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.729] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.730] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.731] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.733] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.734] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.735] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.736] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.736] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.737] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.738] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.738] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.739] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.740] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.740] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.741] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.741] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.742] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.742] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.743] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.744] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.746] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.747] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.750] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.752] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.756] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.758] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.759] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.760] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.760] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.761] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.762] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.763] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.765] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.766] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.770] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.773] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.775] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.776] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.776] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.777] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.778] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.779] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.780] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.782] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.785] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.788] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.790] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.791] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.792] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.792] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.793] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.793] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.794] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.795] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.796] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.797] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.799] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.801] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.805] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.807] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.809] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.810] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.812] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.813] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.814] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.815] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.819] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.822] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.825] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.826] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.826] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.827] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.828] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.829] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.831] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.833] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.836] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.839] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.841] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.842] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.843] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.843] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.844] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.845] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.846] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.847] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.850] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.853] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.856] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.858] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.859] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.859] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.860] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.862] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.864] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.865] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.866] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.868] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.869] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.870] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.870] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.871] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.872] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.872] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.873] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.873] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.874] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.875] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.875] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.876] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.877] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.877] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.879] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.880] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.881] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.883] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.887] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.890] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.892] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.892] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.893] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.894] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.894] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.895] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.896] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.897] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.900] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.903] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.906] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.907] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.908] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.909] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.910] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.911] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.912] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.913] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.915] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.916] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.921] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.923] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.925] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.925] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.926] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.927] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.929] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.930] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.930] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.932] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.935] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.937] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.940] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.941] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.943] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.943] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.944] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.944] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.946] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.947] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.948] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.950] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.951] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.952] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.953] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.953] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.954] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.954] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.955] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.955] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.955] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.956] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.956] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.956] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.957] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.957] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.958] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.958] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.959] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.960] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.961] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.963] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.964] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.965] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.968] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.971] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.974] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.975] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.976] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.977] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.978] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.979] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.980] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.981] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.982] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.984] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.985] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.988] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.992] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.993] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.994] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.995] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.996] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.996] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:28.997] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:28.999] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.001] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.001] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.002] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.004] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.005] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.006] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.007] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.007] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.008] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.008] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.009] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.010] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.010] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.011] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.012] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.014] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.016] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.019] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.023] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.024] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.026] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.027] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.029] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.030] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.032] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.034] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.038] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.041] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.042] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.043] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.044] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.044] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.046] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.047] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.048] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.050] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.053] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.056] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.059] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.060] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.062] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.063] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.065] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.067] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.071] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.073] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.075] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.075] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.076] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.077] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.078] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.079] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.086] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.088] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.089] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.090] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.090] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.091] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.092] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.092] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.093] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.093] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.094] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.096] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.097] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.099] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.101] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.103] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.106] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.108] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.112] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.113] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.114] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.115] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.119] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.122] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.126] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.127] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.128] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.129] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.130] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.131] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.135] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.137] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.140] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.141] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.141] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.142] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.143] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.143] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.144] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.145] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.151] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.153] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.156] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.159] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.162] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.164] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.165] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.167] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.170] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.174] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.176] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.177] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.178] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.178] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.179] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.180] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.181] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.183] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.186] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.189] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.191] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.192] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.193] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.194] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.194] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.196] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.199] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.200] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.204] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.206] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.208] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.209] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.209] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.216] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.220] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.222] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.224] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.225] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.226] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.226] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.227] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.227] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.228] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.229] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.230] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.232] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.234] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.237] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.240] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.241] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.242] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.242] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.243] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.243] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.244] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.244] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.245] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.246] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.250] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.253] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.256] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.258] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.259] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.259] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.261] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.262] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.264] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.265] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.267] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.268] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.273] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.275] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.277] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.277] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.278] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.279] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.280] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.283] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.286] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.289] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.291] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.292] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.293] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.293] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.294] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.295] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.295] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.296] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.298] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.299] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.302] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.304] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.306] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.307] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.308] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.308] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.309] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.309] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.309] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.310] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.310] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.310] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.311] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.312] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.314] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.316] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.319] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.322] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.324] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.325] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.327] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.329] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.331] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.333] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.337] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.340] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.341] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.342] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.342] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.343] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.343] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.343] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.344] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.345] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.346] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.347] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.349] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.350] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.353] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.356] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.357] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.358] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.360] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.360] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.362] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.363] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.365] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.366] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.368] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.371] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.373] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.375] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.376] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.377] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.378] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.378] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.379] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.380] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.382] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.383] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.385] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.387] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.389] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.391] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.392] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.393] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.393] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.394] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.403] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.405] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.407] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.408] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.408] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.409] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.409] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.410] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.410] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.411] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.412] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.413] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.415] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.416] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.418] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.420] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.423] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.425] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.426] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.426] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.427] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.427] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.428] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.430] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.431] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.433] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.434] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.436] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.438] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.440] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.441] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.442] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.442] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.443] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.443] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.444] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.445] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.447] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.449] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.451] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.454] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.456] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.457] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.458] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.458] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.458] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.459] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.459] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.459] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.460] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.460] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.460] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.461] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.461] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.462] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.462] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.464] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.466] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.469] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.471] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.473] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.474] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.475] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.475] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.476] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.476] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.477] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.478] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.480] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.481] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.482] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.483] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.486] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.488] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.490] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.491] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.493] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.493] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.494] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.495] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.496] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.497] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.498] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.499] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.501] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.504] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.507] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.508] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.509] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.510] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.513] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.515] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.517] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.520] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.523] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.524] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.526] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.526] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.527] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.527] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.529] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.530] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.531] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.532] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.534] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.535] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.539] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.542] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.543] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.545] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.547] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.552] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.559] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.561] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.562] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.564] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.569] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.570] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.573] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.577] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.580] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.581] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.583] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.584] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.586] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.587] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.591] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.593] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.595] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.596] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.598] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.599] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.601] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.602] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.604] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.606] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.606] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.607] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.607] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.608] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.609] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.609] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.609] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.610] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.610] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.610] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.611] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.611] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.613] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.614] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.616] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.617] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.619] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.620] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.624] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.627] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.628] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.632] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.635] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.637] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.640] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.643] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.647] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.648] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.649] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.650] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.653] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.654] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.655] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.658] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.662] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.664] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.665] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.666] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.668] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.670] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.674] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.676] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.678] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.679] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.680] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.683] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.688] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.689] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.690] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.690] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.691] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.691] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.692] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.692] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.693] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.693] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.694] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.694] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.695] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.696] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.697] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.698] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.701] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.702] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.704] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.707] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.711] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.715] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.720] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.723] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.725] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.727] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.728] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.729] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.730] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.732] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.736] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.740] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.742] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.743] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.743] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.744] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.744] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.744] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.746] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.746] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.748] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.750] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.752] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.754] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.756] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.757] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.758] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.759] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.760] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.760] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.762] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.762] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.763] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.764] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.766] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.767] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.768] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.770] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.772] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.774] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.775] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.775] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.776] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.776] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.776] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.777] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.777] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.777] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.778] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.780] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.781] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.782] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.784] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.786] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.789] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.791] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.792] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.793] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.793] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.794] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.795] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.797] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.800] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.802] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.805] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.807] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.808] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.809] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.809] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.810] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.811] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.811] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.813] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.813] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.815] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.817] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.819] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.819] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.821] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.823] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.825] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.826] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.827] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.828] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.829] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.830] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.833] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.834] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.838] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.840] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.841] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.841] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.842] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.842] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.843] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.843] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.843] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.844] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.844] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.844] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.845] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.846] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.847] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.849] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.851] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.853] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.856] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.857] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.858] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.859] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.859] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.860] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.860] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.860] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.861] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.862] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.863] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.865] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.867] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.869] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.872] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.874] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.875] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.875] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.876] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.877] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.877] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.878] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.879] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.880] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.883] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.884] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.888] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.890] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.891] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.892] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.893] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.894] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.897] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.899] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.903] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.907] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.909] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.909] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.910] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.910] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.911] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.912] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.913] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.915] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.917] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.919] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.920] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.923] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.926] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.928] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.929] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.930] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.930] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.931] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.932] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.932] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.933] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.934] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.934] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.935] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.936] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.936] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.937] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.937] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.938] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.938] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.939] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.940] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.940] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.941] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.941] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.942] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.942] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.943] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.944] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.944] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.945] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.945] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.946] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.947] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.947] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.948] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.948] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.949] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.950] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.952] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.955] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.957] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.960] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.961] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.963] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.965] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.967] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.970] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.973] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.974] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.976] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.977] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.979] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.981] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.983] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.984] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.987] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.990] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.991] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.992] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:29.995] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:29.998] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.001] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.002] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.004] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.005] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.006] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.008] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.010] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.013] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.016] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.017] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.018] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.020] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.023] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.026] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.028] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.029] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.030] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.031] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.033] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.034] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.037] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.040] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.042] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.044] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.044] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.046] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.047] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.049] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.051] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.052] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.053] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.054] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.055] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.056] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.056] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.056] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.057] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.057] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.058] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.058] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.058] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.059] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.059] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.059] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.060] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.060] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.060] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.060] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.061] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.061] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.062] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.064] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.067] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.068] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.072] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.075] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.077] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.077] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.079] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.080] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.084] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.087] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.091] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.093] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.095] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.096] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.099] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.103] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.107] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.109] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.111] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.113] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.114] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.115] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.116] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.118] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.120] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.121] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.122] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.122] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.123] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.124] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.124] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.125] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.125] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.126] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.127] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.127] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.128] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.129] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.131] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.134] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.137] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.140] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.143] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.145] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.146] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.147] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.150] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.152] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.156] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.159] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.162] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.163] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.164] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.165] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.166] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.167] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.170] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.171] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.173] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.173] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.174] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.174] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.175] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.176] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.176] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.177] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.177] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.178] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.179] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.181] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.182] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.185] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.188] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.191] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.193] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.194] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.196] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.197] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.200] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.204] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.208] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.209] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.210] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.211] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.212] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.213] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.214] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.217] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.220] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.225] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.227] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.229] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.230] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.230] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.233] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.235] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.239] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.241] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.243] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.244] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.246] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.247] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.248] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.248] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.251] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.252] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.253] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.254] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.254] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.255] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.255] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.256] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.256] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.257] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.258] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.258] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.259] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.259] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.260] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.261] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.261] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.262] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.263] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.265] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.268] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.272] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.275] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.277] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.278] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.279] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.281] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.283] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.285] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.289] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.293] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.294] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.295] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.296] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
 [16:51:30.298] WARN  [DebateProviderResolver] No fresh model for resolved key {provider=groq, keyId=409ad81d, rejectedCombos=["groq|llama-3.3-70b-versatile|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.3-70b-versatile|*","groq|llama-3.1-8b-instant|409ad81d-985c-4cef-ab65-6a2e7a7e7929","groq|llama-3.1-8b-instant|*"]}
 [DEBATE_FALLBACK] resolveProvider returned null {anyWorking: true, allKeysCount: 17, failedProviders: Array(2)}
 [16:51:30.300] WARN  [DebateLlmCaller] resolveProvider returned null {anyWorking=true, allKeysCount=17, failedProviders=["openrouter","nvidia"]}
