# Roadmap — AQUARIUM Module Evolution

> Multi-phase evolution plan for the Aquarium visualization: animated ecosystem representing system state.
> Created 2026-06-01, based on current state of `src/components/AquariumPanel/` and the experimental `FEATURE_FLAGS.EXPERIMENTAL_VISUALS` flag.

---

## 📊 Current State (v4.6.0)

### Aquarium Panel (`/aquarium`)
Experimental animated visualization where providers are represented as living creatures in an underwater ecosystem. Health = behavior, reputation = size, activity = movement.

### Implemented ✅
- **Provider visualization as fish** — per-provider fish with status, reputationScore, color, speed, size
- **8 entity types** — Fish (providers), Jellyfish (idle), Seaweed (passive), FoodParticle (events), Bubble (chat), CleanerBot (maintenance), ProviderAquariumShape
- **2 custom hooks** — `useAquariumEngine` (main loop), `useAquariumScene` (scene state), `useLatest` (ref pattern)
- **Interaction** — click to select provider, drag to interact, mouse position tracking
- **Pause/resume** — toggle animation
- **Provider colors** — reuses `providerColors` from `styles/common.ts`
- **Data source** — `useKeyStore()` for live provider state
- **Feature flag** — `FEATURE_FLAGS.EXPERIMENTAL_VISUALS` (gated, opt-in)
- **Tests** — `AquariumPanel.test.tsx` (basic rendering)

### Known Gaps ❌
- Only visualizes providers — debates, agents, memory are not represented
- No themes (only underwater — no space, no forest, no city)
- No audio (silent visualization)
- No sharing (cannot save/screenshot aquarium state)
- No educational layer (what does each fish represent? no info)
- No achievements (gamification: "saw 10 different species")
- No custom decorations (background is hardcoded)
- No time-of-day cycle (always daylight)
- No weather effects (storm = provider outage visualization)
- No data overlay (hover for live stats)
- No mini-games (feeding contests, races)
- Performance limits (~50 fish tested, what about 200?)
- Mobile/touch interactions not optimized
- No save/restore of camera angle
- No "guided tour" for new users
- No correlation visualization (which fish ate which food? who helped who?)

---

## 🎯 Phase 1: Polish & Information (P0 — 1-2 weeks)

### 1.1 Data Overlay (Hover for Live Stats) ✅ DONE
**Why:** Fish are pretty but opaque. Hover for live provider stats turns decoration into dashboard.

**Plan:**
- Hover any fish: tooltip with provider name, status, health, requests/min, errors
- Hover seaweed: shows total uptime
- Hover cleaner-bot: shows last maintenance time
- Hover food: shows what event triggered it (e.g. "rate limit hit on Groq")
- Click fish: opens full provider detail panel (existing panel)
- Zoom level: see more detail in tooltip at higher zoom

**Files:**
- `src/components/AquariumPanel/components/FishTooltip.tsx` — new
- `src/components/AquariumPanel/hooks/useHoverDetection.ts` — new
- `src/components/AquariumPanel/AquariumPanel.tsx` — integrate tooltip layer
- `src/components/AquariumPanel/types.ts` — extend entity types with `data: ProviderData | EventData`

**Effort:** 3-4 days

### 1.2 Educational Info Panel ✅ DONE
**Why:** New users don't know what they're looking at. Need a "guide" mode.

**Plan:**
- "?" button: toggles educational overlay
- Each entity type has info card: "🐟 Fish = Provider. Size = requests. Color = health."
- First-time visitor: shows intro modal explaining ecosystem
- Persistent guide: dismissible, can be re-opened
- "Learn more" links to docs

**Files:**
- `src/components/AquariumPanel/EducationalOverlay.tsx` — new
- `src/components/AquariumPanel/EntityInfoCard.tsx` — new
- `src/components/AquariumPanel/IntroModal.tsx` — new
- `src/data/aquarium-glossary.ts` — new (entity definitions)
- `src/i18n/en.ts`, `src/i18n/ru.ts` — add aquarium education strings

**Effort:** 2-3 days

### 1.3 Performance Optimization (200+ Fish) ✅ DONE
**Why:** Current implementation struggles past 50 entities. Need to support 200+ for stress testing.

**Plan:**
- Spatial partitioning: only render entities near viewport
- LOD (level of detail): distant fish are simpler shapes
- Object pooling: reuse fish objects instead of creating/destroying
- OffscreenCanvas: render in worker thread
- Frame rate target: 60fps with 200 entities
- Performance overlay: show FPS, entity count, render time

**Files:**
- `src/components/AquariumPanel/hooks/useSpatialIndex.ts` — new (quadtree)
- `src/components/AquariumPanel/hooks/useObjectPool.ts` — new
- `src/components/AquariumPanel/hooks/useLOD.ts` — new
- `src/components/AquariumPanel/workers/aquarium-renderer.worker.ts` — new
- `src/components/AquariumPanel/PerfOverlay.tsx` — new
- `src/styles/common.ts` — add `perfOverlay*` constants

**Effort:** 5-6 days

### 1.4 Screenshots & Sharing ✅ DONE
**Why:** "Look at my beautiful aquarium!" — need way to share.

**Plan:**
- "Screenshot" button: captures current frame as PNG
- Auto-timestamp + provider list overlay
- Save to disk or copy to clipboard
- "Share" button: generates shareable link with state (encoded base64)
- Recent screenshots gallery (last 10)
- Optional watermark

**Files:**
- `src/components/AquariumPanel/ScreenshotCapture.tsx` — new
- `src/components/AquariumPanel/ShareDialog.tsx` — new
- `src/components/AquariumPanel/ScreenshotGallery.tsx` — new
- `src/hooks/useCanvasCapture.ts` — new
- `src/utils/share-encoder.ts` — new (base64 state encoding)

**Effort:** 3-4 days

---

## 🚀 Phase 2: Themes & Immersion (P1 — 2-3 weeks)

### 2.1 Multiple Themes (Space, Forest, City, Cyberpunk)
**Why:** Underwater is cool, but variety keeps it fresh. Different themes match different moods.

**Plan:**
- Theme registry: each theme defines background, entity types, colors, animations
- 4 themes: Ocean (existing), Space (fish → rockets, seaweed → stars, bubbles → planets), Forest (fish → birds, seaweed → trees), Cyberpunk (neon, digital rain)
- Theme selector in panel header
- Smooth transition animation when switching themes (1-2 seconds)
- Custom theme support: user defines their own mapping

**Files:**
- `src/components/AquariumPanel/themes/ThemeProvider.tsx` — new
- `src/components/AquariumPanel/themes/ocean.ts` — new (extract existing)
- `src/components/AquariumPanel/themes/space.ts` — new
- `src/components/AquariumPanel/themes/forest.ts` — new
- `src/components/AquariumPanel/themes/cyberpunk.ts` — new
- `src/components/AquariumPanel/themes/ThemeSelector.tsx` — new
- `src/components/AquariumPanel/themes/ThemeTransition.tsx` — new

**Effort:** 6-8 days (large creative effort)

### 2.2 Audio (Ambient + Event Sounds)
**Why:** Silent aquarium is half the experience. Sound completes immersion.

**Plan:**
- Ambient soundtrack: ocean waves, deep sea sounds (procedurally generated or CC0 samples)
- Event sounds: bubble pop (success), splash (error), underwater whoosh (rotation)
- Volume controls: master + per-category
- Mute toggle in panel header
- Optional: music sync (visualizations react to beat)
- Save user preferences

**Files:**
- `src/components/AquariumPanel/AudioManager.ts` — new (Web Audio API wrapper)
- `src/components/AquariumPanel/AudioControls.tsx` — new
- `src/components/AquariumPanel/hooks/useAmbientAudio.ts` — new
- `src/data/aquarium-sounds.ts` — new (sound manifest)
- `src/styles/common.ts` — add `audio*` constants

**Effort:** 5-6 days

### 2.3 Time-of-Day & Weather Cycles
**Why:** Always-daylight aquarium is static. Day/night + weather adds dynamism.

**Plan:**
- Day/night cycle: 10-minute real-time loop = 1 aquarium day
- Lighting: warm tones daytime, cool blues nighttime
- Stars/moon at night, sun rays during day
- Weather: clear, cloudy, storm (visualized as rain + lightning)
- Storm mode: triggered by provider outage (data-driven)
- Seasonal themes: spring/summer/autumn/winter variations (forest theme)

**Files:**
- `src/components/AquariumPanel/TimeOfDayController.ts` — new
- `src/components/AquariumPanel/WeatherController.ts` — new
- `src/components/AquariumPanel/components/Sun.tsx` — new
- `src/components/AquariumPanel/components/Moon.tsx` — new
- `src/components/AquariumPanel/components/Rain.tsx` — new
- `src/components/AquariumPanel/components/Lightning.tsx` — new
- `src/hooks/useEventBus.ts` — listen for `provider:outage` events

**Effort:** 6-8 days

### 2.4 Multi-Layer Visualizations (Beyond Providers)
**Why:** Aquarium is rich metaphor, wasted on providers only. Other system aspects deserve visualization.

**Plan:**
- **Debate visualization**: coral reef — each debate is a coral, grows with each round, colors = strategy
- **Agent visualization**: fish schools — agents in a group swim together, solo agents swim alone
- **Memory visualization**: bubbles rising — memories bubble up when recalled, fade over time
- **Cost visualization**: coins falling — costs rain down, accumulated costs form piles
- **Traffic visualization**: currents — request flow visualized as water currents
- Toggle layers on/off

**Files:**
- `src/components/AquariumPanel/layers/DebateCoralLayer.tsx` — new
- `src/components/AquariumPanel/layers/AgentSchoolLayer.tsx` — new
- `src/components/AquariumPanel/layers/MemoryBubbleLayer.tsx` — new
- `src/components/AquariumPanel/layers/CostCoinLayer.tsx` — new
- `src/components/AquariumPanel/layers/TrafficCurrentLayer.tsx` — new
- `src/components/AquariumPanel/LayerToggle.tsx` — new
- `src/styles/common.ts` — add `layer*` constants

**Effort:** 10-14 days (large feature)

---

## 🌟 Phase 3: Interactivity & Engagement (P2 — 4-6 weeks)

### 3.1 Feed the Fish (Gamification)
**Why:** Passivity is boring. Let user interact meaningfully with ecosystem.

**Plan:**
- Click anywhere: drops food particle
- Fish swim toward food, eat it (grow slightly)
- Different food types: regular (no effect), golden (boosts reputation), poison (decreases health)
- Cost: golden food costs in-game currency earned by uptime
- Stats: "Fish fed: 42", "Favorite fish: Groq"
- "Auto-feed" mode: drops food periodically for ambient activity

**Files:**
- `src/components/AquariumPanel/interaction/FeedingSystem.ts` — new
- `src/components/AquariumPanel/components/FoodParticle.tsx` — extend with food types
- `src/components/AquariumPanel/FeedingControls.tsx` — new
- `src/components/AquariumPanel/FeedingStats.tsx` — new
- `src/kernel/services/aquarium-stats-service.ts` — new
- `src/styles/common.ts` — add `food*` constants

**Effort:** 6-8 days

### 3.2 Achievements & Collection System
**Why:** "I've seen all 12 provider species!" — collection mechanics drive engagement.

**Plan:**
- Achievement system: see all providers, see all error types, survive a storm, etc.
- 30+ achievements: "First Provider" (add 1st key), "Full House" (all 5 default roles), "Survivor" (100 days uptime)
- Each achievement has icon, description, unlock date
- Achievements panel: progress grid
- Rarity: common, rare, legendary
- Optional: share achievement unlocks (screenshot + text)

**Files:**
- `src/components/AquariumPanel/Achievements/AchievementPanel.tsx` — new
- `src/components/AquariumPanel/Achievements/AchievementCard.tsx` — new
- `src/components/AquariumPanel/Achievements/AchievementGrid.tsx` — new
- `src/data/aquarium-achievements.ts` — new
- `src/kernel/services/achievement-service.ts` — new

**Effort:** 5-7 days

### 3.3 Mini-Games
**Why:** Long aquarium sessions get passive. Games add active engagement.

**Plan:**
- **Feeding Contest**: race against time, feed as many fish as possible in 60s
- **Provider Race**: pick 2 providers, see which handles N requests faster (visual race)
- **Cleanup Crew**: control cleaner-bots, remove all food before it pollutes
- **Storm Survival**: keep providers alive through a simulated storm
- Each game has high score, leaderboard (local), unlock conditions
- Mini-game launcher in panel

**Files:**
- `src/components/AquariumPanel/games/FeedingContest.tsx` — new
- `src/components/AquariumPanel/games/ProviderRace.tsx` — new
- `src/components/AquariumPanel/games/CleanupCrew.tsx` — new
- `src/components/AquariumPanel/games/StormSurvival.tsx` — new
- `src/components/AquariumPanel/games/GameLauncher.tsx` — new
- `src/components/AquariumPanel/games/Leaderboard.tsx` — new

**Effort:** 12-15 days (large creative effort)

### 3.4 Custom Decorations (User Content)
**Why:** Aquarium feels generic. Let users personalize.

**Plan:**
- Upload custom background image (CC0 or user-owned)
- Place custom decorations: rocks, plants, castles, signs
- Drag-drop placement, resize, rotate
- Save as "scenes": different decorations for different moods
- Share scene as JSON
- 5-10 built-in decorations to start

**Files:**
- `src/components/AquariumPanel/decorations/DecorationLayer.tsx` — new
- `src/components/AquariumPanel/decorations/DecorationPicker.tsx` — new
- `src/components/AquariumPanel/decorations/DecorationItem.tsx` — new
- `src/components/AquariumPanel/decorations/SceneManager.tsx` — new
- `src/hooks/useDragRotateResize.ts` — new
- `src/data/built-in-decorations.ts` — new

**Effort:** 8-10 days

---

## 🔬 Phase 4: Advanced Visualization & AI (P3 — 2-3 months)

### 4.1 Correlation Visualization (Who's Eating Whose Food)
**Why:** Providers are independent. But "when X fails, Y gets more traffic" is a real phenomenon.

**Plan:**
- Visualize request flow: arrow from Provider A (failed) to Provider B (took over)
- Animated particle streams between providers
- Color-coded: red = failover, green = cooperative, blue = load balance
- Click connection: see stats ("X failed 5 times today, B absorbed 200 requests")
- Toggle: show/hide correlations
- Threshold: only show strong correlations (>10 events)

**Files:**
- `src/components/AquariumPanel/correlation/CorrelationLayer.tsx` — new
- `src/components/AquariumPanel/correlation/FlowParticle.tsx` — new
- `src/components/AquariumPanel/correlation/CorrelationStats.tsx` — new
- `src/kernel/services/correlation-service.ts` — new (analyzes event bus)
- `src/styles/common.ts` — add `flow*` constants

**Effort:** 10-12 days

### 4.2 Predictive Visualization (AI Sees the Future)
**Why:** Aquarium shows current state. What if it shows predicted state?

**Plan:**
- LLM analyzes recent trends, predicts next hour state
- Ghost fish: semi-transparent preview of predicted state
- Provider predicted to fail: fish shows red glow before failure
- Provider predicted to recover: fish slowly changes color
- "Prediction accuracy" stat: how often predictions were correct
- User feedback: "this prediction was right/wrong"

**Files:**
- `src/components/AquariumPanel/prediction/PredictionLayer.tsx` — new
- `src/components/AquariumPanel/prediction/GhostFish.tsx` — new
- `src/components/AquariumPanel/prediction/PredictionAccuracy.tsx` — new
- `src/kernel/services/prediction-service.ts` — new (LLM-based)
- `src/llm/prompts/prediction-prompt.ts` — new

**Effort:** 12-15 days (depends on LLM availability)

### 4.3 Multi-Aquarium View (Tabs)
**Why:** One aquarium per system. What about per-team, per-project, per-customer?

**Plan:**
- Multiple aquariums: tabs at top of panel
- Each aquarium is independent: own providers, own theme, own entities
- "Switch" button: jump between aquariums with smooth transition
- "Compare" mode: split-screen two aquariums side by side
- Aquariums stored separately, can be deleted
- Default aquarium: "Main" (all providers)

**Files:**
- `src/components/AquariumPanel/MultiAquarium/AquariumTabs.tsx` — new
- `src/components/AquariumPanel/MultiAquarium/AquariumSwitcher.tsx` — new
- `src/components/AquariumPanel/MultiAquarium/CompareView.tsx` — new
- `src/components/AquariumPanel/MultiAquarium/AquariumManager.tsx` — new
- `src/kernel/services/aquarium-instance-service.ts` — new

**Effort:** 8-10 days

### 4.4 Aquarium as Live Wallpaper
**Why:** Aquarium is too cool to be hidden in a panel. Show it as background.

**Plan:**
- "Wallpaper mode": aquarium as fullscreen background
- Click through to apps (transparent foreground)
- Configurable: which entities, which layers, which theme
- Battery-aware: lower FPS on low battery
- Auto-hide UI: clean visual experience
- Toggle from any panel via keyboard shortcut

**Files:**
- `src/components/AquariumPanel/wallpaper/WallpaperMode.tsx` — new
- `src/components/AquariumPanel/wallpaper/WallpaperConfig.tsx` — new
- `src/hooks/useBattery.ts` — new
- `src/hooks/useFullscreen.ts` — new
- `src/styles/common.ts` — add `wallpaper*` constants

**Effort:** 8-10 days

---

## 📅 Summary

| Phase | Items | Total Effort | When |
|-------|-------|--------------|------|
| Phase 1 (P0) | 4 | 13-17 days | 1-2 weeks |
| Phase 2 (P1) | 4 | 27-36 days | 2-3 weeks |
| Phase 3 (P2) | 4 | 31-40 days | 4-6 weeks |
| Phase 4 (P3) | 4 | 38-45 days | 2-3 months |
| **Total** | **16** | **~109-138 days** | **~5-7 months** |

---

## 🎯 Recommended First Sprint

**If you only do one thing this week, do Data Overlay (Hover for Live Stats) (1.1).**

It's:
- **High impact** — turns decoration into actionable dashboard
- **Self-contained** — no new infrastructure
- **Quick win** — 3-4 days, immediate value
- **Foundation** — stats are needed for many other features (correlations, predictions, mini-games)
- **Discoverability** — reveals hidden information, encourages exploration

**Second priority**: Performance Optimization (1.3) — without this, the panel can't scale to 100+ providers.

**Third priority**: Screenshots & Sharing (1.4) — fun, shareable, encourages pride in the visualization.

---

## 🔗 Cross-Module Synergies

- **Provider stats** (Providers roadmap) → Data Overlay (1.1) shows real-time metrics
- **Debate metrics** (Debate roadmap 3.1) → Multi-Layer Visualizations (2.4) for debate coral reef
- **Agent stats** (Agents roadmap 1.1) → Agent School Layer in (2.4)
- **Memory** (Chats roadmap 3.1) → Memory Bubble Layer in (2.4)
- **Cost tracking** (Pricing) → Cost Coin Layer in (2.4)
- **Event Bus** (kernel) → Correlation Visualization (4.1) analyzes all events
- **Predictions** (LLM-based) → Predictive Visualization (4.2) uses provider trends
- **Mini-games** (3.3) → can use real provider performance for races/competitions

---

*Document version: 1.0 — 2026-06-01*
*Next review: after Phase 1 completion (estimated 2026-06-15)*
