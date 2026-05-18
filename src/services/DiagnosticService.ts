import { resolve } from './service-resolver';
import { DiagnosticService as KernelDiagnosticService } from '../kernel/services/runtime-intelligence/diagnostic-service';
import { advisorService } from './AdvisorService';
export { KernelDiagnosticService as DiagnosticService };
export type { IDiagnosticService } from '../kernel/contracts/diagnostic-service';
export type { DiagnosticScope, ProviderDiagnostic, SystemDiagnostic, DiagnosticRunRecord } from '../kernel/contracts/diagnostic-service';
export type { CognitiveIssue } from '../kernel/contracts/cognitive-intelligence';
export type { DiagnosticFinding } from '../kernel/contracts/advisor';

interface KeyReference {
  readonly id?: string;
  readonly keyId?: string;
  readonly provider?: string;
}

type DiagnosticFacade = KernelDiagnosticService & {
  analyzeKey(key: string | KeyReference): ReturnType<typeof advisorService.analyzeKey>;
  generateSummary(findings: ReturnType<typeof advisorService.analyzeKey>): string;
  getHealthScore(findings: ReturnType<typeof advisorService.analyzeKey>): number;
};

const runtimeDiagnosticService = resolve<KernelDiagnosticService>('diagnosticService');

const advisorDiagnostics = {
  analyzeKey(key: string | KeyReference) {
    const keyId = typeof key === 'string' ? key : key.id ?? key.keyId ?? key.provider ?? 'unknown';
    return advisorService.analyzeKey(keyId);
  },
  generateSummary(findings: ReturnType<typeof advisorService.analyzeKey>) {
    return advisorService.getDiagnosticSummary(findings);
  },
  getHealthScore(findings: ReturnType<typeof advisorService.analyzeKey>) {
    return advisorService.getHealthScore(findings);
  },
};

export const diagnosticService = new Proxy(runtimeDiagnosticService as DiagnosticFacade, {
  get(target, prop, receiver) {
    if (prop in advisorDiagnostics) {
      return advisorDiagnostics[prop as keyof typeof advisorDiagnostics];
    }
    return Reflect.get(target, prop, receiver);
  },
});
