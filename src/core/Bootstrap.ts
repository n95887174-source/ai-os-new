import { orchestrator } from '../services/OrchestrationService';
import { AuditorTopology } from './IntelligenceDSL';
import { eventBus } from './events';
import { settingsService } from '../services/SettingsService';
import { agentService } from '../services/AgentService';
import { toolService } from '../services/ToolService';
import { advisorService } from '../services/AdvisorService';
import { sandboxService } from '../services/SandboxService';
import { kernel } from './Kernel';

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
    
    // Dynamically imported services to avoid circular deps during boot
    import('../services/MemoryService').then(m => m.memoryService.destroy()).catch(console.error);
    import('../services/CognitiveService').then(c => c.cognitiveService.destroy()).catch(console.error);
    import('../services/ChatService').then(c => c.chatService.destroy()).catch(console.error);
    import('../services/HealthCheckService').then(c => c.healthCheckService.destroy()).catch(console.error);
    import('../services/KeyService').then(c => c.keyService.destroy()).catch(console.error);
    import('../services/OrchestrationService').then(c => c.orchestrator.destroy()).catch(console.error);
    import('../services/PolicyService').then(c => c.policyService.destroy()).catch(console.error);
    import('../services/RoleService').then(c => c.roleService.destroy()).catch(console.error);
    import('../services/SnapshotService').then(c => c.snapshotService.destroy()).catch(console.error);
    import('../services/DebateService').then(c => c.debateService.destroy()).catch(console.error);

    this.isStarted = false;
  }
}

export const bootstrapper = new SystemBootstrap();
