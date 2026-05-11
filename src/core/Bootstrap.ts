import { orchestrator } from '../services/OrchestrationService';
import { AuditorTopology } from './IntelligenceDSL';
import { eventBus } from './events';
import { settingsService } from '../services/SettingsService';
import { agentService } from '../services/AgentService';
import { toolService } from '../services/ToolService';
import { advisorService } from '../services/AdvisorService';
import { sandboxService } from '../services/SandboxService';
import { kernel } from './Kernel';
import { memoryService } from '../services/MemoryService';
import { cognitiveService } from '../services/CognitiveService';
import { chatService } from '../services/ChatService';
import { healthCheckService } from '../services/HealthCheckService';
import { keyService } from '../services/KeyService';
import { policyService } from '../services/PolicyService';
import { roleService } from '../services/RoleService';
import { snapshotService } from '../services/SnapshotService';
import { debateService } from '../services/DebateService';

/**
 * SuperAgents OS - System Bootstrapper
 * 
 * Responsible for initializing the system state, mounting the default 
 * cognitive topologies, and starting autonomous simulation loops.
 */
class SystemBootstrap {
  private isStarted = false;

  async init() {
    if (this.isStarted) return;
    this.isStarted = true;

    console.log('[Bootstrap] Initializing Super-Agents OS Runtime...');
    await kernel.init();
    await settingsService.init();
    await agentService.init();
    await toolService.init();
    await advisorService.init();

    orchestrator.mount(AuditorTopology);

    eventBus.emit('system:command', { action: 'run_health_checks' });

    eventBus.emit('system:notification', { 
      message: 'Kernel initialized. AuditorTopology v1.0.0 mounted.', 
      type: 'success' 
    });

    eventBus.emit('system:notification', {
      message: 'All core services running. Ready for inputs.',
      type: 'info'
    });
  }

  shutdown() {
    console.log('[Bootstrap] Shutting down Super-Agents OS Runtime...');
    kernel.destroy();
    advisorService.destroy();
    agentService.destroy();
    sandboxService.destroy();
    memoryService.destroy();
    cognitiveService.destroy();
    chatService.destroy();
    healthCheckService.destroy();
    keyService.destroy();
    orchestrator.destroy();
    policyService.destroy();
    roleService.destroy();
    snapshotService.destroy();
    (debateService as { destroy?: () => void }).destroy?.();

    this.isStarted = false;
  }
}

export const bootstrapper = new SystemBootstrap();
