import { eventBus } from '../core/events';

export interface DebateArgument {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  confidence: number;
  timestamp: number;
  round: number;
}

export interface DebateSession {
  id: string;
  topic: string;
  status: 'active' | 'completed';
  rounds: number;
  arguments: DebateArgument[];
  consensus?: string;
}

/**
 * SuperAgents OS - Debate Arena Service
 * 
 * Orchestrates multi-agent dialectics to reach higher-level 
 * cognitive consensus. Implements round-based argumentation.
 */
class DebateService {
  private activeSession: DebateSession | null = null;

  startDebate(topic: string, agents: any[]) {
    this.activeSession = {
      id: crypto.randomUUID().slice(0, 8),
      topic,
      status: 'active',
      rounds: 0,
      arguments: []
    };
    console.log(`[DebateArena] Starting session: ${topic}`);
    eventBus.emit('debate:started', this.activeSession);
  }

  addArgument(agentName: string, content: string, confidence: number = 0.9) {
    if (!this.activeSession) return;
    
    const arg: DebateArgument = {
      id: crypto.randomUUID().slice(0, 8),
      agentId: agentName.toLowerCase(),
      agentName,
      content,
      confidence,
      timestamp: Date.now(),
      round: this.activeSession.rounds + 1
    };

    this.activeSession.arguments.push(arg);
    eventBus.emit('debate:argument', arg);
    eventBus.emit('debate:updated', this.activeSession);
  }

  getSession() {
    return this.activeSession;
  }
}

export const debateService = new DebateService();
