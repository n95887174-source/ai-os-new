export const BOOTSTRAP_SERVICES = [
  'configService', 'settingsService', 'keyService', 'toolService', 'sandboxService', 'agentService',
  'memoryService', 'featureFlagService', 'cognitiveService', 'policyService', 'roleService', 'snapshotService',
  'debateService', 'metricsService', 'advisorService', 'pricingService',
  'budgetService', 'usageTracker', 'cacheService', 'chatService',
  'timelineService', 'adminService', 'healthCheckService', 'monitoringService',
  'routingPolicyService', 'whatIfService', 'pressureMapService', 'diagnosticService',
  'notificationWebhookService', 'compromiseWebhookService', 'externalSecretsService',
  'workspaceService',
  'probeService',
  'groupManagerService',
  'systemStatusService',
] as const;
