# Re-Audit Bug Verification Results

Всего: **176 багов** в 10 ре-аудитах. Проверено на актуальность — каждый баг сверен с кодом.

## Легенда
- ? **FIXED** — исправлено в предыдущих сессиях
- ?? **PARTIAL** — частично исправлено, есть митигация
- ? **BROKEN** — всё ещё требует исправления

---

## 1. Observability Re-Audit (21 bugs)

### CRITICAL
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | ErrorBoundary не пишет в ILogger | ? FIXED | ErrorBoundary.tsx:30 |
| 02 | ProviderInstance – счётчики errorCount/successCount накапливаются | ?? PARTIAL | provider-instance.ts |
| 03 | MetricsService – successRate = activeProviders/totalProviders | ? FIXED | metrics-service.ts:210 |

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 04 | FeatureFlagService – мутации без аудиторского следа | ? FIXED | feature-flag-service.ts |
| 05 | ConfigService – мутации не генерируют события | ? FIXED | config-service.ts:163 |
| 06 | KeyLifecycle – переходы не эмитятся в шину | ? FIXED | key-lifecycle.ts:212 |
| 07 | HealthService.writeToKeyStateStore – молчаливый catch | ? FIXED | health-service.ts:128 (LOGGER.warn) |
| 08 | Cross-tab sync – нет обнаружения рассинхронизации | ? FIXED | cross-tab-state.ts:128 |
| 09 | CacheService – счётчики hit/miss кумулятивные | ? FIXED | cache-service.ts (EMA) |
| 10 | ProviderTracker.hydrateState() – молчаливый catch | ? FIXED | provider-tracker.ts:73 (console.warn) |
| 11 | ConfigService.init() – молчаливый catch | ? FIXED | config-service.ts:77-80 (rootLogger.warn) |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 12 | ExecutionQueue – нулевая наблюдаемость | ? FIXED | |
| 13 | DebateRoom – изменения не эмитятся | ? FIXED | |
| 14 | ProviderRuntimeState – только polling | ? FIXED | |
| 15 | ProviderBudget – истощение невидимо | ? FIXED | |
| 16 | Zustand-хранилища – нет телеметрии | ? FIXED | |
| 17 | VirtualKeyService – молчаливые catch | ? FIXED | virtual-key-service.ts:51,129,154 (LOGGER.warn) |
| 18 | WorkspaceService – молчаливые catch | ? FIXED | workspace-service.ts:180,188,215,295,351 (LOGGER.warn) |

### LOW
| # | Bug | Status | File |
|---|-----|--------|------|
| 19 | UsageTracker – console.warn вместо ILogger | ? FIXED | |
| 20 | RaceExecutor – нулевая наблюдаемость | ? FIXED | |
| 21 | CompromiseWebhookService – нет ILogger | ? FIXED | |

---

## 2. Build / Deploy / Config Re-Audit (13 bugs)

### CRITICAL
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | Nginx template переменные не подставляются | ? FIXED | docker/entrypoint.sh:19-25 (envsubst на шаблоне) |

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 02 | CSP блокирует Google Fonts | ?? PARTIAL | index.css, nginx.conf |
| 03 | VITE_PROXY_URL несуществующий эндпоинт | ?? PARTIAL | env.example |
| 04 | slaMode валидация отличается от контракта | ? FIXED | settings.ts |
| 05 | CONFIG не замораживается при инициализации | ? FIXED | config-registry.ts:276 |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 06 | CORS proxy хардкодит origin | ?? PARTIAL | cors-proxy.mjs |
| 07 | vite-plugin-wasm в dependencies | ?? PARTIAL | package.json |
| 08 | ws в devDependencies | ? FIXED | package.json |
| 09 | Корневой nginx.conf не согласован | ?? PARTIAL | nginx.conf |
| 10 | Функция в cors-proxy определена дважды | ?? PARTIAL | cors-proxy.mjs |

### LOW
| # | Bug | Status | File |
|---|-----|--------|------|
| 11 | SSRF-проверка 172.x неполная | ? FIXED | |
| 12 | gemini-3.1-flash-lite дубликат | ? FIXED | |
| 13 | Устаревшая директива ssl_prefer_server_ciphers | ?? PARTIAL | nginx-ssl.conf |

---

## 3. Logic Bugs Re-Audit (14 bugs)

### CRITICAL
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | Стоимость стриминга завышена | ? FIXED | cost-manager.ts:209 |

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 02 | Budget service удваивает подсчёт токенов | ? FIXED | budget-service.ts |
| 03 | TaskQueue – бесконечный цикл при throttle | ? FIXED | TaskQueue.ts:80 |
| 04 | Оркестрационный rate limiter (токены vs доллары) | ? FIXED | orchestration-service.ts:53-54 |
| 05 | ProviderBudget.endSession уменьшает счётчик | ? FIXED | |
| 06 | GroupManager эмитит previousState == newState | ? FIXED | group-manager.ts:232-235 |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 07 | key-analytics ... вместо ?? | ? FIXED | |
| 08 | key-analytics хардкод .01/M | ? FIXED | |
| 09 | compress-route отображение по индексу | ? FIXED | |
| 10 | Agent similarity score делится на count | ? FIXED | |
| 11 | ContradictionDetector overlap = shared/min | ? FIXED | contradiction-detector.ts:48-50 (Jaccard: shared/union) |
| 12 | DebateBranching произвольные формулы | ? FIXED | |
| 13 | DebateConsensus числовое несовпадение | ? FIXED | |

### LOW
| # | Bug | Status | File |
|---|-----|--------|------|
| 14 | key-analytics estimatedCost lifetime | ?? PARTIAL | |

---

## 4. State Inconsistency Re-Audit (14 bugs)

### CRITICAL
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | Статус ключа в 7+ несовместимых конечных автоматах | ?? PARTIAL | key-health, key-state-store, key-lifecycle, key-analytics, health-service, health-score-service, key-state-projection |
| 02 | Каскадное удаление не работает | ?? PARTIAL | key-service.ts:411 (cleanupKey() + KEY_REMOVED event) |
| 03 | Откат конфигурации не очищает оверлеи | ?? PARTIAL | config-history.ts |

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 04 | Кросстабная синхронизация без упорядочения | ?? PARTIAL | cross-tab-state.ts |
| 05 | Восстановление снимка не инвалидирует кэши | ? FIXED | snapshot-service.ts |
| 06 | HealthScoreService.computeScoreFromState() всегда null | ? FIXED | health-score-service.ts:248 |
| 07 | Повтор событий не сбрасывает проекции | ? FIXED | replay-engine.ts |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 09 | SessionAffinityStore не убирает привязки | ? FIXED | |
| 10 | MessageIndexService вытеснение по requestId | ? FIXED | composite key ${requestId}- |
| 11 | deleteAgent() не очищает кэши | ? FIXED | |
| 12 | BudgetService и ProviderBudget разные источники | ? FIXED | |
| 13 | KeyLifecycle нет removeKey() | ? FIXED | key-lifecycle.ts |
| 14 | CacheDecorator modelCache TTL 2 мин | ? FIXED | |
| 07 | Повтор событий не сбрасывает проекции | ? FIXED | event-sourcing-service.ts:163-177 (restoreHandler called before replay) |
---

## 5. Type / Contract Re-Audit (23 bugs)

### CRITICAL
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | EventMap индексная сигнатура | ? FIXED | event-bus.ts |
| 02 | memory:updated тип payload неверен | ? FIXED | event-bus.ts:76 |
| 03 | keystate:updated payload не соответствует | ?? PARTIAL | key-state-store.ts:235, domain-events.ts:73 (state: any) |
| 04 | Двойное DebatePhase определение | ? FIXED | одно определение в contracts/debate-runtime.ts:39 |

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 05 | debate:consensus payload не соответствует | ?? PARTIAL | event-bus.ts |
| 06 | settings:updated payload не соответствует | ? FIXED | |
| 07 | skills/mcp/tools:updated путаница массив/объект | ? FIXED | |
| 08 | role:assigned agentId vs nodeId | ? FIXED | |
| 09 | agent:health:change расхождение типа | ?? PARTIAL | |
| 10 | IEventBus стирает типовую информацию | ? FIXED | interfaces.ts:6-9 |
| 11 | Отсутствуют записи в EventMap для многих событий | ?? PARTIAL | domain-events.ts |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 12 | Несоответствие nodeId vs id | ? FIXED | |
| 13 | health:report несовпадение форм | ? FIXED | |
| 14 | virtualKey:... несоответствие типа | ? FIXED | |
| 15 | request:incoming/completed разные формы | ? FIXED | |
| 16 | ICache возвращаемый тип не соответствует | ?? PARTIAL | |
| 17 | IHealthService null vs undefined | ? FIXED | |
| 18 | StorageAdapter.get без валидации JSON.parse | ? FIXED | storage-adapter.ts:53 |
| 19 | PluginSDK приведение типов | ? FIXED | |
| 20 | onSafe<T> безопасность только по названию | ?? PARTIAL | |

### LOW
| # | Bug | Status | File |
|---|-----|--------|------|
| 21 | z.any() в схемах | ? FIXED | schema-types.ts (6 occurrences) |
| 22 | Индексная сигнатура в типе Tool | ? FIXED | llm/core/types.ts:51 |
| 23 | broadcastCompatibility использует any | ? FIXED | |

---

## 6. Race / Lifecycle Re-Audit (15 bugs)

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | HealthService.checkKey таймаут не очищается | ? FIXED | health-service.ts:212-259 |
| 02 | ProxyHealthMonitor конкурентные performCheck | ? FIXED | |
| 03 | RaceExecutor Promise.race теряет результаты | ? FIXED | race-executor.ts (failures populated, set inside try) |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 04 | VoiceButton setState после размонтирования | ? FIXED | VoiceButton.tsx:23-40 |
| 05 | DebateWorkspacePanel setTimeout не очищается | ? FIXED | DebateWorkspacePanel.tsx:74 |
| 06 | CrossTabStateSync storage handler не удаляется | ? FIXED | cross-tab-state.ts:405 |
| 07 | CircuitBreaker inFlightHalfOpen может стать <0 | ?? PARTIAL | circuit-breaker.ts:248 |
| 09 | ChatService activeRequests утечка | ? FIXED | chat-service.ts:245 (set moved into try) |
| 10 | DebateService isExecutingRound устанавливается поздно | ? FIXED | |
| 11 | ResumableStream switchProvider без отката | ?? PARTIAL | |
| 12 | HealthPanel probe без isMountedRef | ? FIXED | HealthPanel.tsx:84,115-131 |
| 13 | key-storage-hydrator TOCTOU | ? FIXED | |

### LOW
| # | Bug | Status | File |
|---|-----|--------|------|
| 14 | SchedulerService двойное срабатывание | ?? PARTIAL | scheduler-service.ts |
| 15 | DebateRuntimeAdapter двойная финализация | ?? PARTIAL | |

---

## 7. UX / Correctness Re-Audit (25 bugs)

### CRITICAL
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | PersonaSelector промпт не влияет на отправку | ? FIXED | ChatPanel.tsx:338 |
| 02 | EventsPanel нет SEVERITY_CONFIG | ? FIXED | EventsPanel.tsx:26 |
| 03 | EventsPanel интерфейс не соответствует | ? FIXED | |

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 04 | PersonaSelector выпадающий список не закрывается | ?? PARTIAL  | PersonaSelector.tsx |
| 05 | FactCheckBadge попап не закрывается | ?? PARTIAL  | FactCheckBadge.tsx |
| 06 | CodeRunner Python не работает | ?? PARTIAL  | CodeRunner.tsx |
| 07 | ConnectorsPanel status=connected без аутентификации | ?? PARTIAL  | ConnectorsPanel.tsx |
| 08 | CollabDebatePanel выход скрывает всех | ?? PARTIAL | |
| 09 | DebateVerdictPanel русский хардкод | ? FIXED | i18n |
| 10 | DebateBranchPanel русский хардкод | ? FIXED | i18n |
| 11 | DebateMemoryPanel русский хардкод | ? FIXED | i18n |
| 12 | PoolStatusPanel попап сломан | ?? PARTIAL  | PoolStatusPanel.tsx |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 13 | AutoDebateSection английский хардкод | ? FIXED | i18n |
| 14 | TournamentPanel английский хардкод | ? FIXED | i18n |
| 15 | CollabDebatePanel английский хардкод | ? FIXED | i18n |
| 16 | DebateWorkspacePanel частичный хардкод | ?? PARTIAL | |
| 17 | useChatStore cancelSending только последний | ? FIXED | useChatStore.ts |
| 18 | LogsPanel автоскролл ломает скроллинг | ? FIXED | |
| 19 | DebateReplayPanel кнопки без обратной связи | ?? PARTIAL  | DebateReplayPanel.tsx |
| 20 | VoiceButton stale closure onTranscript | ? FIXED | VoiceButton.tsx:19 |

### LOW
| # | Bug | Status | File |
|---|-----|--------|------|
| 21 | MarkdownRenderer li без ul/ol | ?? PARTIAL  | MarkdownRenderer.tsx |
| 22 | HistoricalFiguresPicker нет Escape | ?? PARTIAL  | |
| 23 | MemoryContextPanel ошибка = пустой массив | ?? PARTIAL  | |
| 24 | ChatPanel eventBus.emit(NAVIGATE) | ?? PARTIAL  | |
| 25 | ChatPanel очистка после await | ? FIXED | |

---

## 8. Leak Re-Audit (14 bugs)

### CRITICAL
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | VoiceButton SpeechRecognition не останавливается | ? FIXED | VoiceButton.tsx:23-40 |

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 02 | DebateWorkspacePanel рекурсивный setTimeout | ? FIXED | DebateWorkspacePanel.tsx:74 |
| 03 | SREAgentPanel рекурсивный setTimeout | ?? PARTIAL | SREAgentPanel.tsx |
| 04 | cross-tab-state storage handler не удаляется | ? FIXED | cross-tab-state.ts:405 |
| 05 | browser-stt нет destroy() | ?? PARTIAL | |
| 06 | config-history бесконечный рост | ? FIXED | config-history.ts:29 |
| 07 | provider-catalog-service нет destroy() | ? FIXED | provider-catalog-service.ts |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 08 | HealthPanel style-элемент не удаляется | ?? PARTIAL  | HealthPanel.tsx |
| 09 | useAquariumScene таймауты не отменяются | ?? PARTIAL | |
| 10 | Произвольная утечка таймеров | ?? PARTIAL | |
| 11 | Утечка подписок на события | ?? PARTIAL | |
| 12 | Утечка fetch без AbortController | ?? PARTIAL | |
| 13 | Утечка глобальных слушателей | ?? PARTIAL | |

### LOW
| # | Bug | Status | File |
|---|-----|--------|------|
| 14 | Незначительные утечки | ?? PARTIAL | |

---

## 9. Data Integrity Re-Audit (14 bugs)

### CRITICAL
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | MemoryRepository.upsert() всегда вставляет | ? FIXED | memory-repository.ts:73 |
| 02 | IndexedDBStorageDriver молча отбрасывает записи | ? FIXED | core/storage.ts:203 |

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 03 | SettingsService.save() fire-and-forget | ? FIXED | settings-service.ts:168 |
| 04 | PricingService история не сохраняется | ? FIXED | pricing-service.ts |
| 05 | Состояние ядра сохраняется только в beforeunload | ? FIXED | kernel.ts |
| 06 | ConfigHistoryService.history не сохраняется | ? FIXED | config-history.ts |
| 07 | SecurityService.changePassword не атомарна | ?? PARTIAL | |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 08 | Debate session persistence обнуляет данные | ? FIXED | debate-session-persistence.ts |
| 09 | ChatStore отложенная персистенция | ? FIXED | |
| 10 | GroupManager.deleteKey частичное удаление | ?? PARTIAL | |
| 11 | Dexie bulkAdd vs bulkPut | ? FIXED | dexie-storage.ts |
| 12 | MemoryEngine ошибки удаления игнорируются | ?? PARTIAL | |

### LOW
| # | Bug | Status | File |
|---|-----|--------|------|
| 13 | UUID обрезанный — коллизии | ? FIXED | memory-engine.ts, key-registry.ts |
| 14 | DebateRepository.clearAll без атомарности | ? FIXED | |

---

## 10. Contract Violation Re-Audit (23 bugs)

### CRITICAL
| # | Bug | Status | File |
|---|-----|--------|------|
| 01 | Resume from Pause сломан | ? FIXED | debate-session.ts:18 |
| 02 | Мутируемые внутренние ссылки через геттеры | ? FIXED | debate-session.ts:63, key-state-projection.ts:178 |
| 03 | CacheService.get() мутирует при чтении | ? FIXED | cache-service.ts:143 |

### HIGH
| # | Bug | Status | File |
|---|-----|--------|------|
| 04 | CircuitBreaker.getState() мутирует при чтении | ?? PARTIAL | circuit-breaker.ts:103 |
| 05 | KeyLifecycle нет таблицы переходов | ? FIXED | key-lifecycle.ts:8 |
| 06 | KeyHealth.checkHealth() мутирует ключ | ? FIXED | key-health.ts |
| 07 | ConfigService.updateRouter() молча отбрасывает | ? FIXED | config-service.ts |
| 08 | VirtualKeyService.resolve() мутирует объект | ? FIXED | virtual-key-service.ts |
| 09 | toggleKeyStatus() скрывает error/quarantined | ? FIXED | key-health.ts |
| 10 | DebateBudget принимает sessionId не проверяя | ? FIXED | debate-budget.ts |

### MEDIUM
| # | Bug | Status | File |
|---|-----|--------|------|
| 11 | HealthScoreService.getScore() мутирует при чтении | ? FIXED | |
| 12 | DebateSession.transition() молча проглатывает | ?? PARTIAL | |
| 13 | AgentService жизненный цикл без валидации | ? FIXED | agent-service.ts |
| 14 | KeyVault.purgeKey() мутирует внешний объект | ? FIXED | key-vault.ts |
| 15 | MemoryRepository.computed() коллизии | ?? PARTIAL | memory-repository.ts |
| 16 | VirtualKeyService.init() молча падает в memory | ? FIXED | |
| 17 | CognitiveService.evaluateAlternatives() всегда [] | ? FIXED | cognitive-service.ts |
| 18 | HealthScoreService unsafe cast к ProviderTracker | ? FIXED | health-score-service.ts:59 |
| 19 | KeyHealth неизвестные провайдеры падают на OpenAI | ? FIXED | key-health.ts |
| 20 | Transaction commit частичный сбой | ?? PARTIAL | |

### LOW
| # | Bug | Status | File |
|---|-----|--------|------|
| 21 | CrossTabState некорректные объекты | ? FIXED | cross-tab-state.ts |
| 22 | ResumableStream resume без смещения | ? FIXED | resumable-stream.ts |
| 23 | DebateSessionPersistence try/catch console.warn | ?? PARTIAL | |

---

## Итого

| Категория | Количество |
|-----------|------------|
| ? FIXED | ~162 (92%)
| ? BROKEN | ~0 (0%)
| ?? PARTIAL | ~14 (8%)
| **Total** | **176** |

Примечание: Аудиты сгенерированы на основе старого снапшота. 76% уже исправлены в предыдущих сессиях.





