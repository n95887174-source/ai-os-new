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
  status: 'idle' | 'active' | 'paused' | 'completed';
  strategy: 'round_robin' | 'moderated' | 'free_for_all';
  maxRounds: number;
  currentRound: number;
  participants: string[]; // Agent IDs
  arguments: DebateArgument[];
  consensus?: string;
  convergenceScore: number;
}

/**
 * SuperAgents OS - Debate Arena Service
 * Orchestrates multi-agent dialectics to reach higher-level cognitive consensus.
 */
class DebateService {
  private activeSession: DebateSession | null = null;
  private simulationInterval: any = null;

  startDebate(topic: string, participants: string[], strategy: 'round_robin' | 'moderated' | 'free_for_all' = 'round_robin', maxRounds: number = 10) {
    this.activeSession = {
      id: crypto.randomUUID().slice(0, 8),
      topic,
      status: 'active',
      strategy,
      maxRounds,
      currentRound: 1,
      participants,
      arguments: [],
      convergenceScore: 30 // Starts low
    };
    
    console.log(`[DebateArena] Starting session: ${topic}`);
    eventBus.emit('debate:started', this.activeSession);
    this.startSimulation();
  }

  pauseDebate() {
    if (this.activeSession && this.activeSession.status === 'active') {
      this.activeSession.status = 'paused';
      clearInterval(this.simulationInterval);
      eventBus.emit('debate:updated', this.activeSession);
    }
  }

  resumeDebate() {
    if (this.activeSession && this.activeSession.status === 'paused') {
      this.activeSession.status = 'active';
      this.startSimulation();
      eventBus.emit('debate:updated', this.activeSession);
    }
  }

  stopDebate() {
    if (this.activeSession) {
      this.activeSession.status = 'completed';
      clearInterval(this.simulationInterval);
      eventBus.emit('debate:updated', this.activeSession);
    }
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
      round: this.activeSession.currentRound
    };

    this.activeSession.arguments.push(arg);
    
    // Simulate convergence
    this.activeSession.convergenceScore = Math.min(100, this.activeSession.convergenceScore + (Math.random() * 10));

    if (this.activeSession.arguments.length % this.activeSession.participants.length === 0) {
      this.activeSession.currentRound++;
      if (this.activeSession.currentRound > this.activeSession.maxRounds) {
        this.stopDebate();
      }
    }

    eventBus.emit('debate:argument', arg);
    eventBus.emit('debate:updated', this.activeSession);
  }

  getSession() {
    return this.activeSession;
  }

  private startSimulation() {
    clearInterval(this.simulationInterval);
    this.simulationInterval = setInterval(() => {
      if (!this.activeSession || this.activeSession.status !== 'active') return;
      if (this.activeSession.participants.length === 0) return;

      const agentIndex = (this.activeSession.arguments.length) % this.activeSession.participants.length;
      const agentId = this.activeSession.participants[agentIndex];
      
      const mockArguments = [
        `I have analyzed the current paradigm for "${this.activeSession.topic}". My primary concern is the latency overhead introduced by sequential processing.`,
        `I disagree. While latency is a factor, prioritizing security guardrails provides a 40% reduction in unauthorized access attempts. We must prioritize safety.`,
        `From a purely algorithmic perspective, we can achieve both by parallelizing the semantic router while keeping the guardrails synchronous.`,
        `That is an interesting proposition. Let's run a simulated trace on parallel routing... The results indicate a potential race condition in memory access.`,
        `Agreed. To mitigate the race condition, we should implement a distributed lock mechanism on the cognitive memory layer.`,
        `Excellent deduction. I am updating my confidence interval. We are approaching a viable consensus.`
      ];

      const argText = mockArguments[this.activeSession.arguments.length % mockArguments.length];
      
      // We will look up the real agent name in the UI, here we just pass ID as name if we don't know it
      this.addArgument(agentId, argText, 0.7 + Math.random() * 0.25);
    }, 4000);
  }
}

export const debateService = new DebateService();
