import type { IFeatureFlagService, FeatureFlag } from '../contracts/feature-flags';
import { DEFAULT_FEATURE_FLAGS } from '../contracts/feature-flags';
import type { ILifecycle } from '../contracts/lifecycle';

export class FeatureFlagService implements IFeatureFlagService, ILifecycle {
  private flags: Record<FeatureFlag, boolean> = { ...DEFAULT_FEATURE_FLAGS };
  private listeners = new Set<(flag: FeatureFlag, enabled: boolean) => void>();

  async init(): Promise<void> {}

  async start(): Promise<void> {}

  destroy(): void {
    this.listeners.clear();
  }

  isEnabled(flag: FeatureFlag): boolean {
    return this.flags[flag] ?? DEFAULT_FEATURE_FLAGS[flag] ?? false;
  }

  setEnabled(flag: FeatureFlag, enabled: boolean): void {
    if (this.flags[flag] === enabled) return;
    this.flags[flag] = enabled;
    for (const cb of this.listeners) cb(flag, enabled);
  }

  getAll(): Record<FeatureFlag, boolean> {
    return { ...this.flags };
  }

  reset(): void {
    this.flags = { ...DEFAULT_FEATURE_FLAGS };
  }

  onChange(callback: (flag: FeatureFlag, enabled: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
