# Plugin Development Prompt

## Purpose
Create a plugin or extension for SuperAgents OS.

## Structure
```
src/plugins/[plugin-name]/
├── index.ts          # Plugin entry point + registration
├── service.ts        # Business logic (extends kernel service pattern)
├── types.ts          # Plugin-specific types
└── test.ts           # Tests
```

## Registration Pattern
```typescript
import { container } from '../../kernel/container';
import { eventBus } from '../../kernel/event-bus';

export function registerPlugin() {
  // 1. Register any new services
  container.register('myPlugin', new MyPluginService(deps));

  // 2. Subscribe to events
  const unsub = eventBus.on('my:event', handler);

  // 3. Return cleanup
  return () => { unsub(); };
}
```

## Rules
- Import contracts, not concrete services
- Use EventBus for cross-plugin communication
- Clean up subscriptions in destroy()
- Follow the kernel service lifecycle (constructor → init → destroy)
