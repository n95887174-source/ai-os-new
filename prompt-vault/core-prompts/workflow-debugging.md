# Workflow Debugging Prompt

## Purpose
Debug cognitive topology execution issues.

## Checklist
- Check EventBus: is the event being emitted?
- Check EventBus subscribers: is the listener registered?
- Check `init()`: was `setupListeners()` called?
- Check state: does `getState()` show expected values?
- Check console: any unhandled rejections or warnings?
- Check DI: is the service registered in bootstrap?

## Common Issues
| Symptom | Likely Cause |
|---------|-------------|
| Event emitted but no response | Listener not registered in `init()` |
| State not persisting | `isDirty` not set, or save interval not started |
| Circular dependency | Service imports concrete implementation, not contract |
| Test timeout | Missing `await svc.init()` in test setup |
