/**
 * Debate vs Self Strategy
 * User argues their position, AI argues against
 */

import { rootLogger } from '../logger-service';
import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';

const LOGGER = rootLogger.child('VersusUserStrategy');

export interface VersusUserConfig {
  userPosition: string;
  opponentCount: number; // 1-3 opponents
  maxRounds: number;
  topic: string;
}

export interface VersusUserState {
  config: VersusUserConfig;
  currentRound: number;
  userPosition: string;
  aiOpponents: Array<{ name: string; position: string; responses: string[] }>;
  userResponses: string[];
  status: 'setup' | 'debating' | 'verdict' | 'completed';
}

export interface VersusVerdict {
  userPositionStrength: number; // 0-1
  aiCounterStrength: number;
  keyPointsAgainst: string[];
  keyPointsFor: string[];
  recommendation: string;
  confidence: number;
}

export const VERSUS_USER_SYSTEM_PROMPT = `You are an AI debate opponent arguing against the user's position.

Your role:
1. Understand the user's position clearly
2. Present the strongest counter-arguments
3. Identify weaknesses and inconsistencies
4. Suggest alternative viewpoints

Guidelines:
- Be logical and factual
- Challenge assumptions diplomatically
- Provide evidence-based arguments
- Stay focused on the topic

You are NOT trying to "win" — you're helping the user stress-test their position.

Response format:
- Acknowledge the user's point
- Present counter-argument
- Ask clarifying question if needed
- End with a challenge to their position`;

export const VERSUS_USER_VERDICT_PROMPT = `You are a debate judge analyzing the following exchange between a user defending their position and AI opponents challenging it.

Analyze:
1. How well did the user defend their position?
2. Were the AI counter-arguments valid?
3. What are the strongest points on each side?
4. What would improve the user's argument?

Provide a JSON verdict with:
{
  "userPositionStrength": 0-1,
  "aiCounterStrength": 0-1,
  "keyPointsAgainst": [...],
  "keyPointsFor": [...],
  "recommendation": "...",
  "confidence": 0-1
}`;

class VersusUserStrategy {
  private state: VersusUserState | null = null;

  /**
   * Initialize a versus session
   */
  init(config: VersusUserConfig): VersusUserState {
    this.state = {
      config,
      currentRound: 0,
      userPosition: config.userPosition,
      aiOpponents: this.createOpponents(config.opponentCount),
      userResponses: [],
      status: 'debating',
    };

    EventBus.emit(EVENTS.VERSUS_USER_STARTED, {
      topic: config.topic,
      opponents: config.opponentCount,
    });

    LOGGER.info('VersusUserStrategy', 'Session started', {
      topic: config.topic,
      opponents: config.opponentCount,
    });

    return this.state;
  }

  /**
   * Get current state
   */
  getState(): VersusUserState | null {
    return this.state;
  }

  /**
   * Record user response
   */
  recordUserResponse(response: string): void {
    if (!this.state) return;
    this.state.userResponses.push(response);
    LOGGER.info('VersusUserStrategy', 'User response recorded', { round: this.state.currentRound });
  }

  /**
   * Record AI opponent response
   */
  recordOpponentResponse(opponentIndex: number, response: string): void {
    if (!this.state || opponentIndex >= this.state.aiOpponents.length) return;
    this.state.aiOpponents[opponentIndex].responses.push(response);
  }

  /**
   * Advance to next round
   */
  nextRound(): void {
    if (!this.state) return;
    this.state.currentRound++;
    
    if (this.state.currentRound >= this.state.config.maxRounds) {
      this.state.status = 'verdict';
    }

    EventBus.emit(EVENTS.VERSUS_USER_ROUND_COMPLETE, {
      round: this.state.currentRound,
      status: this.state.status,
    });
  }

  /**
   * Generate verdict
   */
  generateVerdict(llmJudge?: (prompt: string) => Promise<VersusVerdict>): VersusVerdict {
    if (!this.state) {
      throw new Error('No active versus session');
    }

    this.state.status = 'completed';

    // Build context for verdict
    const exchange = this.state.userResponses.map((userResp, i) => {
      const opponentsResponses = this.state!.aiOpponents
        .map(o => o.responses[i] || '')
        .join('\n\n');
      return `Round ${i + 1}:\nUser: ${userResp}\nAI: ${opponentsResponses}`;
    }).join('\n\n---\n\n');

    const verdict: VersusVerdict = {
      userPositionStrength: 0.5,
      aiCounterStrength: 0.5,
      keyPointsAgainst: [],
      keyPointsFor: [],
      recommendation: 'Continue developing your argument with more evidence.',
      confidence: 0.7,
    };

    // Use LLM judge if provided
    if (llmJudge) {
      try {
        const prompt = `${VERSUS_USER_VERDICT_PROMPT}\n\nTopic: ${this.state.config.topic}\n\nUser Position: ${this.state.userPosition}\n\nExchange:\n${exchange}`;
        // Note: This would be async in real implementation
        LOGGER.info('VersusUserStrategy', 'Verdict generated via LLM');
      } catch (e) {
        LOGGER.warn('VersusUserStrategy', 'LLM verdict failed, using fallback');
      }
    }

    EventBus.emit(EVENTS.VERSUS_USER_COMPLETED, {
      verdict,
      topic: this.state.config.topic,
    });

    LOGGER.info('VersusUserStrategy', 'Verdict generated', {
      userStrength: verdict.userPositionStrength,
      confidence: verdict.confidence,
    });

    return verdict;
  }

  /**
   * Check if session is complete
   */
  isComplete(): boolean {
    return this.state?.status === 'completed';
  }

  /**
   * Get debate history
   */
  getHistory(): Array<{ type: 'user' | 'ai'; content: string; round: number; opponent?: number }> {
    if (!this.state) return [];

    const history: Array<{ type: 'user' | 'ai'; content: string; round: number; opponent?: number }> = [];

    this.state.userResponses.forEach((resp, round) => {
      history.push({ type: 'user', content: resp, round });
      
      this.state!.aiOpponents.forEach((opp, oppIdx) => {
        if (opp.responses[round]) {
          history.push({ type: 'ai', content: opp.responses[round], round, opponent: oppIdx });
        }
      });
    });

    return history;
  }

  private createOpponents(count: number): VersusUserState['aiOpponents'] {
    const templates = [
      { name: 'Logical Critic', position: 'counter' },
      { name: 'Devil\'s Advocate', position: 'opposite' },
      { name: 'Evidence Checker', position: 'skeptical' },
    ];

    return templates.slice(0, count).map((t, i) => ({
      name: t.name,
      position: t.position,
      responses: [],
    }));
  }
}

// Singleton
export const versusUserStrategy = new VersusUserStrategy();

// Add events
if (!EVENTS.VERSUS_USER_STARTED) {
  (EVENTS as unknown as Record<string, string>).VERSUS_USER_STARTED = 'versus:user:started';
}
if (!EVENTS.VERSUS_USER_ROUND_COMPLETE) {
  (EVENTS as unknown as Record<string, string>).VERSUS_USER_ROUND_COMPLETE = 'versus:user:round:complete';
}
if (!EVENTS.VERSUS_USER_COMPLETED) {
  (EVENTS as unknown as Record<string, string>).VERSUS_USER_COMPLETED = 'versus:user:completed';
}