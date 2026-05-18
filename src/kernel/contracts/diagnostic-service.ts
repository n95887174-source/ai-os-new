import type { CognitiveIssue, SessionDiagnostic } from './cognitive-intelligence';

export type DiagnosticScope = 'system' | 'session' | 'provider';

export interface ProviderDiagnostic {
  readonly provider: string;
  readonly health: 'healthy' | 'degraded' | 'critical';
  readonly score: number;
  readonly issues: CognitiveIssue[];
  readonly metrics: {
    readonly avgLatency: number;
    readonly errorRate: number;
    readonly successRate: number;
    readonly totalRequests: number;
  };
  readonly updatedAt: number;
}

export interface SystemDiagnostic {
  readonly health: 'healthy' | 'degraded' | 'critical';
  readonly score: number;
  readonly sessionCount: number;
  readonly providerCount: number;
  readonly activeIssueCount: number;
  readonly issues: CognitiveIssue[];
  readonly updatedAt: number;
}

export interface DiagnosticRunRecord {
  readonly id: string;
  readonly scope: DiagnosticScope;
  readonly health: string;
  readonly score: number;
  readonly issueCount: number;
  readonly timestamp: number;
}

export interface IDiagnosticService {
  getSystemDiagnostic(): SystemDiagnostic;
  getSessionDiagnostic(sessionId: string): SessionDiagnostic | undefined;
  getProviderDiagnostic(provider: string): ProviderDiagnostic;
  getSessionIssues(sessionId: string): CognitiveIssue[];
  getProviderIssues(provider: string): CognitiveIssue[];
  getAllActiveIssues(): CognitiveIssue[];
  runDiagnostic(scope?: DiagnosticScope): Promise<DiagnosticRunRecord>;
  getDiagnosticHistory(limit?: number): DiagnosticRunRecord[];
  onDiagnosticComplete(cb: (record: DiagnosticRunRecord) => void): () => void;
  destroy(): void;
}
