import { advisorService } from './AdvisorService';
import type { DiagnosticFinding } from '../kernel/contracts/advisor';

export type { DiagnosticFinding };

class DiagnosticService {
  analyzeKey(keyId: string): DiagnosticFinding[] {
    return advisorService.analyzeKey(keyId);
  }

  generateSummary(findings: DiagnosticFinding[]): string {
    return advisorService.getDiagnosticSummary(findings);
  }

  getHealthScore(findings: DiagnosticFinding[]): number {
    return advisorService.getHealthScore(findings);
  }
}

export const diagnosticService = new DiagnosticService();
