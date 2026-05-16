export interface SettingsStateSnapshot {
  theme: 'dark' | 'light';
  language: 'en' | 'ru';
  streamingEnabled: boolean;
  fallbackEnabled: boolean;
  debugMode: boolean;
  autoHealthCheck: boolean;
  explorationFactor: number;
  slaMode: string;
  defaultMode: string;
  activeProfile: string | null;
  profileCount: number;
}
