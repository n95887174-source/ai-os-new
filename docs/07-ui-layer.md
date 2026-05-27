# 07 — UI Layer

## Concept Layer

The UI provides real-time debate visualization and post-hoc analysis. It has two modes: the **DebatePanel** (wraps `DebateService`, used for interactive work) and the **DebateRuntimePanel** (wraps `DebateEngine`, used for topology-driven sessions). Both are reactive — they subscribe to events and update without polling.

## System Mapping Layer

### File Structure

```
src/components/
  DebatePanel/
    DebatePanel.tsx          — main panel (1203 lines)
    AutoDebateSection.tsx    — automated debate controls
    index.ts                 — barrel export
  DebateRuntimePanel/
    DebateRuntimePanel.tsx   — runtime panel (698 lines)
```

### DebatePanel Sections

| Section | Visibility | Content |
|---------|-----------|---------|
| Setup screen | No active session | Topic input, strategy selector, max rounds, temperature slider, archetype toggles, agent grid with Select All/Deselect All, constraint assignments, Check Participants, Initialize button |
| Active debate | Session exists | Header (topic, status, controls), arguments feed (scrolling log with agent cards), injection input bar |
| Analytics sidebar | Active session (380px right) | Convergence bar, stats grid, structural metrics (tree only), constraint compliance (constrained only), analysis insights, quality metrics (depth/originality/usefulness), activity heatmap, most discussed arguments, round timeline, participant roster |
| History tab | Click "History" | Completed sessions list (expandable accordion), consensus display, participant badges, clear history |

### Data Flow

```
DebateService.startDebate()
  → emit('debate:started', session)
    → DebatePanel setSession(session)
  → emit('debate:argument', arg)
    → DebatePanel append arg to feed
  → emit('debate:updated', session)
    → DebatePanel refresh all panels
  → emit('debate:consensus', data)
    → DebatePanel show consensus

DebateEngine.startSession()
  → emit('debate-runtime:session:started')
    → DebateRuntimePanel.refreshSessions()
  → emit('debate-runtime:agent:thinking')
    → debateLiveStore (Zustand)
  → emit('debate-runtime:agent:responded')
    → debateLiveStore
```

### Event Subscriptions

| Panel | Events Subscribed |
|-------|------------------|
| `DebatePanel` | `debate:updated` |
| `DebateRuntimePanel` | `debate-runtime:session:created`, `:started`, `:completed`, `:failed`, `:cancelled`, `:phase:changed` |
| `debateLiveStore` | `debate-runtime:agent:thinking`, `:responded`, `:error`, `:timeout`, `:fallback`, `debate-runtime:round:started`, `:ended` |

## Behavior Layer

- The analytics sidebar only appears during active debate, not in setup or history
- Metrics panels are conditional: structural metrics only for `argument_tree`, constraint compliance only for `constrained`, activity/quality/interpretation only on completion
- The arguments feed auto-scrolls to bottom as new arguments arrive
- Fallback arguments show a red warning banner with the reason
- Human injections appear right-aligned with green accent
- The temperature slider is color-coded (blue → green → yellow → orange → red) and shows a live label
- Agent selection cards use framer-motion spring animations
- Auto-debate section shows progress bars for stress/batch tests
