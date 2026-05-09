import { orchestrator } from '../services/OrchestrationService';
import { AuditorTopology } from './IntelligenceDSL';
import { eventBus } from './events';

/**
 * SuperAgents OS - System Bootstrapper
 * 
 * Responsible for initializing the system state, mounting the default 
 * cognitive topologies, and starting autonomous simulation loops.
 */
class SystemBootstrap {
  private isStarted = false;

  init() {
    if (this.isStarted) return;
    this.isStarted = true;

    console.log('[Bootstrap] Initializing Super-Agents OS Runtime...');

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
}

export const bootstrapper = new SystemBootstrap();
