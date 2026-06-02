# Roadmap — PROVIDERS Module Evolution

> Multi-phase evolution plan for the Provider layer (LLM adapters + provider management).
> Created 2026-06-01, based on current state of `src/llm/`, `src/components/ProviderManager/`, and provider-related services.

---

## 📊 Current State (v4.6.0)

### Implemented ✅
- **19 provider adapters**: gemini, openrouter, nvidia, mock, groq, openai, together, fireworks, deepseek, blackbox, scaleway, cometapi, github, mistral, cohere, azure, huggingface, cerebras, cloudflare
- **7 decorators** on each adapter: `LoggingDecorator`, `CacheDecorator`, `FallbackDecorator`, `CircuitBreakerDecorator`, `RetryDecorator`, `RateLimitDecorator`, `PriorityQueueDecorator`
- **ProviderRouter** with 6 strategies (latency/quality/balanced/economy/free_first), `RouterWeights` (reliability/latency/cost/TTFT/TPS), active profile management
- **KeyService** decomposition: PoolSelectorService, KeyHealth, KeyConfigStore, KeyRegistry, Lifecycle, Fingerprints
- **3-step AddKeyModal**: provider select → key entry + probe → model association
- **BrowseModelsView**, **InstalledProvidersView** (drag-reorder), **ProviderDetailModal**, **RoutingSLAView**, **RoutingIntelligenceView**
- **ProviderDashboard** (real-time metrics per provider), **HealthPanel** (bee visualization), **SystemHealthPanel**, **ProviderMarketplace** (browse + add)
- **ProviderProbe** service with circuit breaker reset, 5s timeout, error classification
- **KeyStateStore** (single source of truth: status, lastProbe, health, quota, routing, flags)
- **KeyNotesPanel** (operator notes with attachments), **ProviderNotes** (per-key notes)
- **DecisionLogPanel** (every routing decision logged), **ProviderTracker** (per-provider metrics, decision log integration)
- **PressureMapPanel** + **RuntimePressureMap** + **WhatIfPanel** (predictive pressure simulation)
- **CostAnalyticsPanel**, **BudgetPanel** (per-provider limits)
- **RotationService** (key rotation), **WebhooksPanel** (webhook CRUD for key events)
- **MessageIndexService** indexes chat:stream:end events, **MessageSearchPanel** searches by provider/model
- **Vite proxy** routes CORS-blocked providers (groq, nvidia, etc.) through `/proxy/*`

### Known Gaps ❌
- No streaming reconnect logic (interrupted streams = full failure)
- No batch/bulk request API (chat sends 1 request, 1 response)
- Tool calling types exist (`Tool`, `ToolCall`) but no provider implements it
- No embeddings adapters (jina/voyage/openai embeddings not wired)
- No image generation (stability, dall-e, etc.)
- No audio (whisper STT, elevenlabs TTS)
- No local model support (Ollama, LM Studio)
- No Anthropic Claude (despite being one of top 3 providers)
- No Perplexity (despite being added to LLM list earlier)
- Circuit breaker doesn't share state across tabs (each tab has its own)
- No cost prediction before request (only post-hoc)
- Provider marketplace has static list, no auto-discovery from `/v1/models`
- No proxy health check (if `/proxy/openai` is down, all requests fail)
- Key rotation is manual only (no automatic rotation policy)

---

## 🎯 Phase 1: Stability & Completeness (P0 — 1-2 weeks)

### 1.1 Tool Calling (L-17) ✅ DONE
**Why:** Currently a "blind" LLM API. Agents can't call functions, debate can't run tools, chat can't act on real data.

**Plan:**
- Add `tools: Tool[]` and `toolChoice` to `SendMessageOptions`
- Implement tool-calling support in: `OpenAICompatibleAdapter` (works for groq, openai, together, fireworks, deepseek, mistral, cerebras), `GeminiAdapter` (uses `tools: { functionDeclarations: [...] }`), `OpenRouterAdapter` (passthrough)
- New `ToolExecutor` service: routes tool calls to existing services (memory, web, code, files)
- Update `ChatPanel` to display tool calls inline (collapsible)
- Add tool-calling support to `DebateService` (optional per-participant)

**Files:**
- `src/llm/core/types.ts` — extend types
- `src/llm/openai-compatible/openai-compatible-adapter.ts` — tool dispatch
- `src/llm/gemini/gemini-adapter.ts` — function declarations
- `src/llm/openrouter/openrouter-adapter.ts` — passthrough
- `src/kernel/services/tool-executor.ts` — execution router
- `src/components/ChatPanel/ChatMessage.tsx` — inline tool display

**Effort:** 3-4 days

### 1.2 Streaming 2.0 — Reconnect + Fallback (L-19)
**Why:** Long debates (20+ rounds) and long chats (1000+ tokens) can hit network timeouts and lose all progress. Need resumable streams.

**Plan:**
- New `ResumableStream` abstraction wrapping `AsyncIterable<string>`
- On disconnect: store last received chunk index in memory, retry with `stream_resume` (provider-specific)
- Provider fallback during stream: switch to different provider mid-stream, prepend provider tag
- Update `ChatService` to expose `streamId` for resumption
- Add "Resume" button in ChatPanel after disconnect
- Metrics: stream health (avg duration, reconnect rate, data loss)

**Files:**
- `src/llm/streaming/resumable-stream.ts` — new
- `src/llm/decorators/retry-decorator.ts` — extend with stream support
- `src/kernel/services/chat-service.ts` — streamId lifecycle
- `src/components/ChatPanel/ChatPanel.tsx` — resume button

**Effort:** 2-3 days

### 1.3 Batch Processing API (L-18)
**Why:** Benchmarking (P-20), batch testing (A-13), bulk operations need parallel request batching with rate-limit awareness.

**Plan:**
- New `batchRequest(requests: BatchRequest[]): Promise<BatchResponse[]>` on LLM facade
- Use `PriorityQueueDecorator` to manage concurrency
- Per-provider rate limit enforced automatically
- Partial-failure handling: return per-request status (success/partial/failed)
- Progress event: `batch:progress` with `{ completed, total, failed }`
- New `BatchPanel` for ad-hoc batches (paste JSON, run, export)

**Files:**
- `src/llm/facade/llm-client.ts` — `batchRequest` method
- `src/llm/decorators/priority-queue.ts` — batch mode
- `src/kernel/services/batch-service.ts` — new
- `src/components/BatchPanel/BatchPanel.tsx` — new

**Effort:** 2-3 days

### 1.4 Anthropic Claude Adapter
**Why:** Top 3 LLM provider. Anthropic has unique `system` parameter, different message format, different stop reasons. Cannot be OpenAI-compatible (subtle diffs in tool use).

**Plan:**
- New `src/llm/anthropic/anthropic-adapter.ts`
- Implement `LLMProviderAdapter`: sendMessage, streamMessage, listModels, healthCheck
- Use Anthropic's native API: `POST https://api.anthropic.com/v1/messages`
- Header: `x-api-key`, `anthropic-version: 2023-06-01`
- Body: `{ model, system, messages, max_tokens, tools?, stream? }`
- Handle: claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus
- Vite proxy entry: `/proxy/anthropic` for CORS
- Add to AdapterFactory, BrowseModelsView, ProviderMarketplace

**Files:**
- `src/llm/anthropic/anthropic-adapter.ts` — new (~300 lines)
- `src/llm/registry/adapter-factory.ts` — register
- `vite.config.ts` — proxy
- `src/i18n/translations/en.ts` + `ru.ts` — i18n keys

**Effort:** 2 days

### 1.5 Perplexity Adapter
**Why:** Online search LLM. Unique value for debate fact-checking (D-29) and chat (C-23).

**Plan:**
- New `src/llm/perplexity/perplexity-adapter.ts`
- OpenAI-compatible (uses `/v1/chat/completions` at `https://api.perplexity.ai`)
- Models: `llama-3.1-sonar-small-128k-online`, `llama-3.1-sonar-large-128k-online`, etc.
- Extract `citations` from response for fact-check pipeline
- Add to AdapterFactory

**Files:**
- `src/llm/perplexity/perplexity-adapter.ts` — new
- `src/llm/registry/adapter-factory.ts` — register

**Effort:** 1 day

---

## 🚀 Phase 2: New Capabilities (P1 — 2-4 weeks)

### 2.1 Local Model Support (Ollama + LM Studio) ✅ DONE
**Why:** Zero cost, full privacy, offline. Hobby user values this.

**Plan:**
- `OllamaAdapter`: OpenAI-compatible at `http://localhost:11434/v1`
- `LMStudioAdapter`: OpenAI-compatible at `http://localhost:1234/v1`
- Auto-detect: scan localhost:11434, 1234, 8080, 5000
- Model discovery: query `/v1/models` on connect, populate BrowseModelsView
- Health check: ping every 60s
- Cost calculation: $0.0000 (free)

**Files:**
- `src/llm/ollama/ollama-adapter.ts` — new
- `src/llm/lmstudio/lmstudio-adapter.ts` — new
- `src/llm/registry/adapter-factory.ts` — register
- `src/components/ProviderManager/BrowseModelsView.tsx` — auto-discovery

**Effort:** 2 days

### 2.2 Embeddings Adapters
**Why:** Memory service (`MemoryService`) currently has no embedding model. RAG is degraded without semantic search.

**Plan:**
- New `IEmbeddingsAdapter` interface (separate from chat adapter)
- Implementations: `OpenAIEmbeddingsAdapter` (text-embedding-3-small/large), `VoyageEmbeddingsAdapter`, `JinaEmbeddingsAdapter`, `OllamaEmbeddingsAdapter` (nomic-embed-text)
- `embed(texts: string[]): Promise<number[][]>` with batching
- Wire into `MemoryService` for vector storage
- Optional: local embeddings (transformers.js for offline)

**Files:**
- `src/llm/embeddings/embeddings-adapter.ts` — new contract
- `src/llm/embeddings/openai-embeddings.ts` — new
- `src/llm/embeddings/voyage-embeddings.ts` — new
- `src/llm/embeddings/ollama-embeddings.ts` — new
- `src/kernel/services/memory-service.ts` — integrate

**Effort:** 3-4 days

### 2.3 Image Generation Adapters
**Why:** Visual feedback for chat (chart generation, diagram explanations), debate (visualization), agents (avatar generation A-16).

**Plan:**
- New `IImageGenAdapter` interface
- Implementations: `OpenAIImagesAdapter` (dall-e-3), `StabilityAdapter` (SDXL), `GeminiImagenAdapter`
- Chat integration: `imageGen(prompt: string): Promise<{ url: string; b64?: string }>`
- Display in ChatPanel as inline image cards
- Storage: localStorage cache + IndexedDB for large images

**Files:**
- `src/llm/image-gen/image-gen-adapter.ts` — new contract
- `src/llm/image-gen/openai-images.ts` — new
- `src/llm/image-gen/gemini-imagen.ts` — new
- `src/llm/image-gen/stability.ts` — new
- `src/components/ChatPanel/ImageMessage.tsx` — new

**Effort:** 3-4 days

### 2.4 Audio Adapters (STT + TTS)
**Why:** Voice input for chat (hands-free), voice output (TTS) for accessibility.

**Plan:**
- STT: `WhisperAdapter` (OpenAI), `GeminiAudioAdapter`
- TTS: `OpenAITTSAdapter` (tts-1, tts-1-hd), `ElevenLabsAdapter`, `BrowserTTSAdapter` (free, Web Speech API)
- Voice input: hold-to-talk button in ChatPanel
- Voice output: auto-play assistant response (toggle)

**Files:**
- `src/llm/audio/stt-adapter.ts` — new contract
- `src/llm/audio/tts-adapter.ts` — new contract
- `src/llm/audio/openai-stt.ts` — new
- `src/llm/audio/openai-tts.ts` — new
- `src/llm/audio/elevenlabs-tts.ts` — new
- `src/llm/audio/browser-tts.ts` — new (free, no API)
- `src/components/ChatPanel/VoiceButton.tsx` — new

**Effort:** 3-4 days

### 2.5 Cost Prediction (Pre-Request) ✅ DONE
**Why:** Currently cost is calculated post-hoc. User should see "this will cost $0.0023" before sending.

**Plan:**
- New `predictCost(messages: ChatMessage[], model: string, provider: string): CostEstimate` in `PricingService`
- Token count: pre-flight estimate (using `tokenEstimate.ts` heuristic)
- Display in ChatPanel input area
- Show in router decision: "Predicted cost: $0.005, actual: $0.0048"
- Add to `DecisionLogPanel` as separate column

**Files:**
- `src/kernel/services/pricing-service.ts` — extend with `predictCost`
- `src/kernel/utils/tokenEstimate.ts` — improve accuracy
- `src/components/ChatPanel/ChatInput.tsx` — display estimate
- `src/components/DecisionLogPanel.tsx` — add column

**Effort:** 2 days

### 2.6 Auto-Rotation Policy
**Why:** Currently keys never auto-rotate. Old keys accumulate, quotas expire, security degrades.

**Plan:**
- New `RotationPolicy` on KeyConfig: `interval: '7d' | '30d' | '90d'`, `notifyBefore: '24h' | '3d'`
- `RotationService` scheduler: checks every hour for due rotations
- On rotation: probe new key, replace old, archive old as `rotated: <timestamp>`
- Notification: emit `key:rotated` event, show in AlertLayer
- UI: `RotationsPanel` already exists — add "Auto-rotation" toggle per key

**Files:**
- `src/kernel/services/rotation-service.ts` — scheduler
- `src/kernel/services/key-management/key-service.ts` — policy storage
- `src/components/RotationsPanel/RotationsPanel.tsx` — UI

**Effort:** 2-3 days

---

## 🌟 Phase 3: Advanced Features (P2 — 4-8 weeks)

### 3.1 Cross-Tab Provider State Sync
**Why:** Open OS in two tabs = two different circuit breakers, two different rate limit counts. Should share via BroadcastChannel.

**Plan:**
- New `CrossTabAdapterState` singleton using `BroadcastChannel('provider-state')`
- Sync: circuit breaker state, rate limit tokens, recent errors
- Conflict resolution: last-write-wins for non-critical, merge for counters
- Fallback: `localStorage` event for older browsers

**Files:**
- `src/kernel/services/cross-tab-state.ts` — new
- `src/llm/decorators/circuit-breaker.ts` — emit changes
- `src/llm/decorators/rate-limit-decorator.ts` — emit changes

**Effort:** 2-3 days

### 3.2 Provider Health Score (Composite)
**Why:** Currently health is binary (active/error). Need 0-100 health score combining latency, errors, quota, reputation, stability.

**Plan:**
- New `healthScore(provider, key)` in `KeyHealth` service
- Formula: `0.4 * reliability + 0.2 * (1 - errorRate) + 0.2 * (1 - latencyPenalty) + 0.2 * quotaHeadroom`
- Display: Provider card shows score badge (color-coded)
- `ProviderHealthTimeline` panel: 7-day score history
- `recommendProvider(task)` returns top-N by health

**Files:**
- `src/kernel/services/key-management/key-health.ts` — extend
- `src/components/HealthPanel/HealthPanel.tsx` — score badge
- `src/components/ProviderDashboard/ProviderDashboard.tsx` — timeline

**Effort:** 2-3 days

### 3.3 Provider Marketplace Auto-Discovery
**Why:** Adding a new provider requires manual `adapter-factory.ts` edit. Should be data-driven.

**Plan:**
- `provider-catalog.json` registry of all known providers (model, baseURL, auth style, capabilities)
- New `ProviderCatalogService` loads on boot
- `AdapterFactory` becomes dynamic: if provider in catalog but no class, use `OpenAICompatibleAdapter` with custom config
- Per-provider `probe()` to test connectivity before adding

**Files:**
- `src/kernel/data/provider-catalog.json` — new
- `src/kernel/services/provider-catalog-service.ts` — new
- `src/llm/registry/adapter-factory.ts` — dynamic dispatch
- `src/components/ProviderMarketplace/ProviderMarketplace.tsx` — auto-fetch

**Effort:** 3-4 days

### 3.4 Proxy Health Monitor
**Why:** Vite proxy is single point of failure. If `/proxy/openai` is down, all requests fail silently with confusing errors.

**Plan:**
- New `ProxyMonitor` service: ping each proxy route every 30s
- Emit `proxy:down` / `proxy:up` events
- Circuit breaker integration: skip proxies with recent failures
- `ProviderDashboard` shows proxy status badge
- `RoutingIntelligence` falls back to direct API if proxy is down

**Files:**
- `src/kernel/services/proxy-monitor.ts` — new
- `src/llm/http/llm-http-client.ts` — skip-down-proxy logic
- `src/components/ProviderDashboard/ProviderDashboard.tsx` — display

**Effort:** 2 days

### 3.5 Provider Personality Profiles
**Why:** Different providers have different "personalities" (Groq = fast/short, Gemini = verbose, Claude = thoughtful). Routing should consider task style.

**Plan:**
- New `ProviderPersonality` type: `{ speed: 0-1, verbosity: 0-1, formality: 0-1, creativity: 0-1, costEfficiency: 0-1 }`
- Calibration: per-provider auto-calibration from 50 sample responses
- Display in ProviderDetailModal: personality radar chart
- Routing: new `personality_match` strategy: choose provider whose profile best matches task style

**Files:**
- `src/kernel/services/provider-personality.ts` — new
- `src/kernel/services/provider-tracker.ts` — store measurements
- `src/components/ProviderManager/ProviderDetailModal.tsx` — radar chart
- `src/kernel/services/provider-router.ts` — new strategy

**Effort:** 4-5 days

### 3.6 Real-Time Provider Negotiation
**Why:** When provider A is overloaded, negotiation with provider B happens only after full failure. Better: pre-emptive negotiation when signs of trouble.

**Plan:**
- New `PredictiveRouter` watches P95 latency, error rate
- When degraded: 30% traffic to backup, 70% primary
- When restored: 100% primary
- UI: shows real-time split in ProviderDashboard
- Logs: predict events to DecisionLog

**Files:**
- `src/kernel/services/predictive-router.ts` — new
- `src/components/ProviderDashboard/ProviderDashboard.tsx` — traffic split view

**Effort:** 3-4 days

---

## 🔬 Phase 4: Research Features (P3 — 2-3 months)

### 4.1 Multi-Provider Ensemble
**Why:** Single provider = single point of failure for quality. Ensemble = 3 providers vote, best response wins.

**Plan:**
- New `EnsembleMode` config: `'vote' | 'best-of-n' | 'cascade'`
- `vote`: same prompt to N providers, choose most common answer
- `best-of-n`: same prompt to N, choose highest-scoring (LLM judge)
- `cascade`: cheapest first, escalate to expensive only if score < threshold
- New `EnsembleService` + `EnsemblePanel`

**Files:**
- `src/kernel/services/ensemble-service.ts` — new
- `src/llm/decorators/ensemble-decorator.ts` — new
- `src/components/EnsemblePanel/EnsemblePanel.tsx` — new

**Effort:** 1 week

### 4.2 Provider Self-Healing
**Why:** When a provider fails, user has to manually switch. System should auto-recover.

**Plan:**
- Circuit breaker per key
- On open: schedule probe every 30s
- On probe success: close circuit, emit `key:recovered`
- Visual: key card flashes green when recovered
- Cache last 100 requests per key for replay testing

**Files:**
- `src/llm/decorators/circuit-breaker.ts` — extend with self-heal
- `src/kernel/services/probe-service.ts` — scheduled probes
- `src/components/ProviderManager/InstalledProvidersView.tsx` — recovery flash

**Effort:** 1 week

### 4.3 Provider Cost Simulator
**Why:** User wants to know "if I switch from Groq to Gemini, my cost goes from $5 to $3, latency from 200ms to 600ms, quality from 8.5 to 9.1".

**Plan:**
- New `CostSimulator` service
- Inputs: current usage pattern, candidate providers
- Output: monthly cost, P95 latency, expected quality score
- Side-by-side comparison table
- "Apply switch" button with one-click migration

**Files:**
- `src/kernel/services/cost-simulator.ts` — new
- `src/components/CostSimulatorPanel/CostSimulatorPanel.tsx` — new

**Effort:** 1-2 weeks

### 4.4 LLM-as-Judge Quality Scoring
**Why:** Latency and cost don't capture quality. Need a separate LLM to grade responses.

**Plan:**
- New `QualityJudge` service
- Configurable: judge model, rubric, scoring scale (1-5, 1-10, A-F)
- For each request: optional quality score stored in `DecisionLog`
- Display: provider quality leaderboard
- A/B testing: compare two providers by quality scores

**Files:**
- `src/kernel/services/quality-judge.ts` — new
- `src/components/QualityLeaderboard/QualityLeaderboard.tsx` — new

**Effort:** 1-2 weeks

### 4.5 WebLLM / Browser-Native Models
**Why:** Run models in browser via WebGPU. Zero server cost, full privacy. New frontier.

**Plan:**
- `WebLLMAdapter` wraps `@mlc-ai/web-llm` library
- Models: Phi-3-mini, Llama-3.2-1B, Gemma-2-2B
- First-load: download model (1-3GB), cache via IndexedDB
- Display: shows download progress, model size, memory usage
- Auto-fallback when cloud providers fail

**Files:**
- `src/llm/webllm/webllm-adapter.ts` — new
- `src/llm/webllm/model-cache.ts` — new
- `package.json` — add `@mlc-ai/web-llm` dep
- `src/components/WebLLMSettings/WebLLMSettings.tsx` — new

**Effort:** 2-3 weeks (research-heavy)

---

## 📊 Summary: Effort & Priority Matrix

| Phase | Items | Total Effort | When |
|-------|-------|--------------|------|
| **Phase 1: Stability** | Tool Calling, Streaming 2.0, Batch, Anthropic, Perplexity | ~10 days | Week 1-2 |
| **Phase 2: New Capabilities** | Local models, Embeddings, Image gen, Audio, Cost prediction, Auto-rotation | ~15-20 days | Week 3-6 |
| **Phase 3: Advanced** | Cross-tab sync, Health score, Catalog, Proxy monitor, Personality, Predictive | ~17-22 days | Week 7-12 |
| **Phase 4: Research** | Ensemble, Self-healing, Cost sim, LLM-judge, WebLLM | ~6-9 weeks | Month 4+ |

**Total to complete all phases: ~3 months full-time**

## 🎯 Recommended First Sprint (this week)

If you only do one thing this week, do **Tool Calling (1.1)**. It's the single highest-impact change — it unlocks:
- Real agents that can act (not just talk)
- Debate with evidence (web search mid-debate)
- Chat with memory reads (RAG)
- File operations during conversation

Tool calling + a few well-chosen tools = 10x the practical utility of the system.

---

*Document version: 1.0 — 2026-06-01*
*Next review: after Phase 1 completion*
