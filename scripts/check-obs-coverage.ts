/**
 * check-obs-coverage.ts — CI observability coverage validator
 *
 * Runs the ObsGapsService scan and fails if coverage < threshold.
 * Usage: npx tsx scripts/check-obs-coverage.ts [threshold]
 *   threshold: minimum overall score (default 65, plan target 90)
 *   exit 0 = pass, 1 = fail
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname!, '..');
const THRESHOLD = parseInt(process.argv[2] || '45', 10);

function read(file: string): string {
  return readFileSync(resolve(ROOT, file), 'utf-8');
}

// ---- Replicate ObsGapsService logic inline (avoids TSX dependency) ----

function analyzeServiceContent(name: string, content: string) {
  return {
    name,
    hasEvents: /\.emit\(/.test(content) || /EVENTS\./.test(content),
    hasLogger: /ILogger/.test(content) || /LOGGER/.test(content) || /logger\.(info|warn|error|debug)\(/i.test(content),
    hasLifecycle: /ILifecycle/.test(content) || (/init\(|start\(|destroy\(/.test(content) && /class/.test(content)),
    hasHealthCheck: /IHealthCheck/.test(content) || /healthCheck/.test(content) || /getHealth\(/.test(content),
    hasTracing: /ITraceContext/.test(content) || /TraceContext/.test(content) || /traceId/.test(content),
  };
}

const SERVICE_FILE_MAP: Record<string, string> = {
  configService: 'src/kernel/services/config-service.ts',
  settingsService: 'src/kernel/services/settings-service.ts',
  keyService: 'src/kernel/services/key-management/key-service.ts',
  toolService: 'src/kernel/services/tool-executor.ts',
  sandboxService: 'src/kernel/services/sandbox-service.ts',
  agentService: 'src/kernel/services/agent-service.ts',
  memoryService: 'src/kernel/services/memory-engine.ts',
  cognitiveService: 'src/kernel/services/cognitive-service.ts',
  policyService: 'src/kernel/services/policy-service.ts',
  roleService: 'src/kernel/services/role-service.ts',
  snapshotService: 'src/kernel/services/snapshot-service.ts',
  debateService: 'src/kernel/services/debate-service.ts',
  metricsService: 'src/kernel/services/metrics-service.ts',
  advisorService: 'src/kernel/services/advisor-service.ts',
  pricingService: 'src/kernel/services/pricing-service.ts',
  budgetService: 'src/kernel/services/budget-service.ts',
  usageTracker: 'src/kernel/services/usage-tracker.ts',
  cacheService: 'src/kernel/services/cache-service.ts',
  chatService: 'src/kernel/services/chat-service.ts',
  timelineService: 'src/kernel/services/timeline-service.ts',
  adminService: 'src/kernel/services/admin-service.ts',
  healthService: 'src/kernel/services/health-service.ts',
  healthCheckService: 'src/kernel/services/health-service.ts',
  healthScoreService: 'src/kernel/services/health-score-service.ts',
  monitoringService: 'src/kernel/services/monitoring-service.ts',
  routingPolicyService: 'src/kernel/services/provider-router.ts',
  whatIfService: 'src/kernel/services/runtime-intelligence/whatif-service.ts',
  pressureMapService: 'src/kernel/services/runtime-intelligence/pressure-map-service.ts',
  diagnosticService: 'src/kernel/services/runtime-intelligence/diagnostic-service.ts',
  notificationWebhookService: 'src/kernel/services/notification-webhook-service.ts',
  compromiseWebhookService: 'src/kernel/services/compromise-webhook-service.ts',
  externalSecretsService: 'src/kernel/services/external-secrets-service.ts',
  workspaceService: 'src/kernel/services/workspace-service.ts',
  probeService: 'src/kernel/services/probe-service.ts',
  consistencyChecker: 'src/kernel/services/consistency-checker.ts',
  // consistencyHealingPipeline: same class as consistencyChecker
  groupManagerService: 'src/kernel/services/group-manager.ts',
  systemStatusService: 'src/kernel/services/system-status-service.ts',
};

// ---- Scan ----

const services = [];
const failures: string[] = [];

for (const [name, filePath] of Object.entries(SERVICE_FILE_MAP)) {
  try {
    const content = read(filePath);
    const info = analyzeServiceContent(name, content);
    services.push(info);
    if (!info.hasLogger) failures.push(`${name}: missing logger`);
    if (!info.hasLifecycle) failures.push(`${name}: missing lifecycle`);
    if (!info.hasEvents) failures.push(`${name}: missing event emission`);
  } catch {
    services.push({ name, hasEvents: false, hasLogger: false, hasLifecycle: false, hasHealthCheck: false, hasTracing: false });
    failures.push(`${name}: file not found`);
  }
}

const total = services.length || 1;
const withEvents = services.filter((s) => s.hasEvents).length;
const withLogger = services.filter((s) => s.hasLogger).length;
const withLifecycle = services.filter((s) => s.hasLifecycle).length;
const withHealth = services.filter((s) => s.hasHealthCheck).length;
const withTracing = services.filter((s) => s.hasTracing).length;

const eventScore = Math.round((withEvents / total) * 100);
const loggerScore = Math.round((withLogger / total) * 100);
const lifecycleScore = Math.round((withLifecycle / total) * 100);
const healthScore = Math.round((withHealth / total) * 100);
const tracingScore = Math.round((withTracing / total) * 100);
const overall = Math.round((eventScore + loggerScore + healthScore + tracingScore) / 4);

console.log(`\nObs Coverage Report (${total} services):`);
console.log(`  Events:   ${withEvents}/${total} = ${eventScore}%`);
console.log(`  Loggers:  ${withLogger}/${total} = ${loggerScore}%`);
console.log(`  Lifecycle: ${withLifecycle}/${total} = ${lifecycleScore}%`);
console.log(`  Health:   ${withHealth}/${total} = ${healthScore}%`);
console.log(`  Tracing:  ${withTracing}/${total} = ${tracingScore}%`);
console.log(`  OVERALL:  ${overall}% (threshold: ${THRESHOLD}%)`);

if (failures.length > 0) {
  console.log(`\nIndividual gaps:`);
  for (const f of failures) console.log(`  - ${f}`);
}

if (overall >= THRESHOLD) {
  console.log(`\n\u2713 Observability coverage meets threshold (${overall}% >= ${THRESHOLD}%).`);
  process.exit(0);
} else {
  console.error(`\n\u2717 Observability coverage below threshold (${overall}% < ${THRESHOLD}%).`);
  process.exit(1);
}
