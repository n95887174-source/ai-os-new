export interface DiagnosticStateSnapshot {
  readonly systemHealth: 'healthy' | 'degraded' | 'critical';
  readonly systemScore: number;
  readonly activeIssueCount: number;
  readonly lastRun: number | null;
  readonly totalRuns: number;
}
