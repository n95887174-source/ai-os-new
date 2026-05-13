import type { ApiKey } from '../types/metrics';
import { FREE_TIER_LIMITS } from './KeyService';

export interface DiagnosticFinding {
  severity: 'info' | 'warning' | 'critical';
  category: 'auth' | 'quota' | 'latency' | 'reliability' | 'usage';
  message: string;
  explanation: string;
  suggestion: string;
  metric?: string;
  timestamp: number;
}

class DiagnosticService {
  analyzeKey(key: ApiKey): DiagnosticFinding[] {
    const findings: DiagnosticFinding[] = [];
    const ext = key.stats?.extended;
    const now = Date.now();

    if (key.status === 'error') {
      findings.push({
        severity: 'critical',
        category: 'auth',
        message: `${key.provider} key is in error state`,
        explanation: `Key "${key.label}" has been marked as error. This often indicates an invalid or revoked API key. The most common causes are: key rotation by the provider, expired credentials, or incorrect key format.`,
        suggestion: `Try re-entering the key or generating a new one from the ${key.provider} dashboard. After updating, run a health check to verify.`,
        timestamp: now,
      });
    }

    if (key.status === 'inactive') {
      findings.push({
        severity: 'warning',
        category: 'auth',
        message: `${key.provider} key is inactive`,
        explanation: `Key "${key.label}" was manually disabled or automatically suspended after repeated failures. It is not in rotation and will not be used for routing.`,
        suggestion: 'Enable the key from the providers list or check the provider dashboard for any account issues.',
        timestamp: now,
      });
    }

    const usageToday = ext?.usageToday?.requests || 0;
    const limit = FREE_TIER_LIMITS[key.provider]?.requestsPerDay;
    if (limit && usageToday > 0) {
      const pct = (usageToday / limit) * 100;
      if (pct >= 90) {
        findings.push({
          severity: 'critical',
          category: 'quota',
          message: `${key.label} at ${Math.round(pct)}% daily quota`,
          explanation: `This key has used ${usageToday.toLocaleString()} of ${limit.toLocaleString()} daily requests (${Math.round(pct)}%). At the current rate, the key will exhaust its quota before the day resets. Once exhausted, requests will be routed to alternative providers.`,
          suggestion: `Add another ${key.provider} key to distribute the load, or wait for the daily quota reset. Consider enabling FreeFirst mode to prioritize free-tier models.`,
          metric: `${usageToday}/${limit}`,
          timestamp: now,
        });
      } else if (pct >= 70) {
        findings.push({
          severity: 'warning',
          category: 'quota',
          message: `${key.label} at ${Math.round(pct)}% daily quota`,
          explanation: `This key has used ${usageToday.toLocaleString()} of ${limit.toLocaleString()} daily requests (${Math.round(pct)}%). It still has capacity but is approaching the limit.`,
          suggestion: 'Monitor the quota trend. If usage continues at this pace, consider adding redundant keys.',
          metric: `${usageToday}/${limit}`,
          timestamp: now,
        });
      }
    }

    if (key.latency) {
      if (key.latency > 3000) {
        findings.push({
          severity: 'critical',
          category: 'latency',
          message: `${key.label} latency is very high (${key.latency}ms)`,
          explanation: `Average response time is ${key.latency}ms, which is significantly above the normal range. This could indicate provider-side degradation, network congestion, or the model being under heavy load. Keys with latency above 2000ms are deprioritized by the router.`,
          suggestion: 'Try switching to a different model or provider. Run a health check to verify current latency. If the issue persists, consider reporting it to the provider.',
          metric: `${key.latency}ms`,
          timestamp: now,
        });
      } else if (key.latency > 1000) {
        findings.push({
          severity: 'warning',
          category: 'latency',
          message: `${key.label} latency is elevated (${key.latency}ms)`,
          explanation: `Average response time is ${key.latency}ms. While still usable, this is above the optimal range. The router may deprioritize this key if faster alternatives are available.`,
          suggestion: 'Monitor the trend. If latency continues to increase, consider switching to a faster provider.',
          metric: `${key.latency}ms`,
          timestamp: now,
        });
      }
    }

    const errors = ext?.errorBreakdown;
    if (errors) {
      const rateLimitCount = errors.rateLimit || 0;
      if (rateLimitCount > 5) {
        findings.push({
          severity: 'warning',
          category: 'reliability',
          message: `High rate-limiting on ${key.label}`,
          explanation: `This key has been rate-limited ${rateLimitCount} times. The provider is throttling requests, which increases latency and causes retries. This typically happens when exceeding the provider's RPM (requests per minute) limit.`,
          suggestion: 'Add a small queue delay (200-500ms) between requests, or distribute load across multiple keys. Consider switching to a provider with higher rate limits.',
          metric: `${rateLimitCount} rate limits`,
          timestamp: now,
        });
      }

      const timeoutCount = errors.timeout || 0;
      if (timeoutCount > 3) {
        findings.push({
          severity: 'critical',
          category: 'reliability',
          message: `Frequent timeouts on ${key.label}`,
          explanation: `This key has timed out ${timeoutCount} times. Persistent timeouts indicate the provider or model is not responding within the configured timeout window. This degrades user experience and wastes request slots.`,
          suggestion: 'Increase the timeout threshold for this provider, or switch to a more responsive alternative. Run a health check to verify current responsiveness.',
          metric: `${timeoutCount} timeouts`,
          timestamp: now,
        });
      }
    }

    const successCount = key.stats?.successCount || 0;
    const errorCount = key.stats?.errorCount || 0;
    const totalRequests = successCount + errorCount;
    if (totalRequests > 10) {
      const successRate = successCount / totalRequests;
      if (successRate < 0.7) {
        findings.push({
          severity: 'critical',
          category: 'reliability',
          message: `Low success rate on ${key.label} (${Math.round(successRate * 100)}%)`,
          explanation: `Only ${Math.round(successRate * 100)}% of requests to this key succeed (${errorCount} errors out of ${totalRequests} total). This indicates a systemic issue rather than transient failures. The router has likely already deprioritized this key.`,
          suggestion: 'Verify the key is still valid in the provider dashboard. Check if the account has been suspended or if billing information needs to be updated.',
          metric: `${Math.round(successRate * 100)}%`,
          timestamp: now,
        });
      } else if (successRate < 0.9) {
        findings.push({
          severity: 'warning',
          category: 'reliability',
          message: `Success rate declining on ${key.label} (${Math.round(successRate * 100)}%)`,
          explanation: `Success rate is ${Math.round(successRate * 100)}% (${errorCount} errors out of ${totalRequests} total). While still functional, the error rate is above the recommended 5% threshold.`,
          suggestion: 'Monitor the trend. If the success rate continues to drop, investigate the error types and consider switching providers.',
          metric: `${Math.round(successRate * 100)}%`,
          timestamp: now,
        });
      }
    }

    return findings;
  }

  generateSummary(findings: DiagnosticFinding[]): string {
    if (findings.length === 0) {
      return 'All systems nominal. No issues detected for this key.';
    }

    const critical = findings.filter(f => f.severity === 'critical');
    const warnings = findings.filter(f => f.severity === 'warning');

    let summary = '';
    if (critical.length > 0) {
      summary += `${critical.length} critical issue${critical.length > 1 ? 's' : ''} detected`;
    }
    if (warnings.length > 0) {
      if (summary) summary += ', ';
      summary += `${warnings.length} warning${warnings.length > 1 ? 's' : ''}`;
    }
    if (!summary) summary = `${findings.length} informational finding${findings.length > 1 ? 's' : ''}`;

    return summary;
  }

  getHealthScore(findings: DiagnosticFinding[]): number {
    if (findings.length === 0) return 100;
    let score = 100;
    for (const f of findings) {
      if (f.severity === 'critical') score -= 25;
      else if (f.severity === 'warning') score -= 10;
      else score -= 3;
    }
    return Math.max(0, score);
  }
}

export const diagnosticService = new DiagnosticService();
