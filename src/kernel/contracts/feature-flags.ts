export const FEATURE_FLAGS = {
  MEMORY_ENABLED: 'memory.enabled',
  MEMORY_SEMANTIC: 'memory.semantic',
  MEMORY_RAG_ON_CHAT: 'memory.ragOnChat',
  MEMORY_AUTO_STORE: 'memory.autoStore',
  DEBATE_RUNTIME_ENGINE: 'debate.runtimeEngine',
  EXPERIMENTAL_VISUALS: 'ui.experimentalVisuals',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlag, boolean> = {
  'memory.enabled': true,
  'memory.semantic': true,
  'memory.ragOnChat': true,
  'memory.autoStore': true,
  'debate.runtimeEngine': false,
  'ui.experimentalVisuals': false,
};

export interface IFeatureFlagService {
  isEnabled(flag: FeatureFlag): boolean;
  setEnabled(flag: FeatureFlag, enabled: boolean): void;
  getAll(): Record<FeatureFlag, boolean>;
  reset(): void;
  onChange(callback: (flag: FeatureFlag, enabled: boolean) => void): () => void;
}
