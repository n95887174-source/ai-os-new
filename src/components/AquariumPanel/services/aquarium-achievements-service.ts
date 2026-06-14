/**
 * Aquarium Achievements Service
 * Gamification achievements
 */

import { rootLogger } from '../../../kernel/services/logger-service';
import { eventBus } from '../../../kernel/events/event-bus';
import { EVENTS } from '../../../kernel/events/event-names';
import { StorageAdapter } from '../../../kernel/services/storage-adapter';

const LOGGER = rootLogger.child('AquariumAchievements');

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  { id: 'first-fish', name: 'Welcome Aboard', description: 'See your first provider fish', icon: '🐟', rarity: 'common' },
  { id: 'diverse-school', name: 'Diverse School', description: 'Have 5+ providers active', icon: '🐠', rarity: 'common' },
  { id: 'night-owl', name: 'Night Owl', description: 'View aquarium after midnight', icon: '🦉', rarity: 'common' },
  { id: 'speed-demon', name: 'Speed Demon', description: 'See a fish move at max speed', icon: '⚡', rarity: 'rare' },
  { id: 'storm-chaser', name: 'Storm Chaser', description: 'Experience a stormy weather cycle', icon: '⛈️', rarity: 'rare' },
  { id: 'screenshot-pro', name: 'Screenshot Pro', description: 'Capture 10 screenshots', icon: '📸', rarity: 'rare' },
  { id: 'deep-dive', name: 'Deep Dive', description: 'Hover over 20 different fish', icon: '🔍', rarity: 'rare' },
  { id: 'theme-park', name: 'Theme Park', description: 'Try all 4 aquarium themes', icon: '🎨', rarity: 'epic' },
  { id: 'fisherman', name: 'Master Fisherman', description: 'Have all providers at 100% health', icon: '🎣', rarity: 'epic' },
  { id: 'collector', name: 'Collector', description: 'Unlock 20 achievements', icon: '🏆', rarity: 'epic' },
  { id: 'centurion', name: 'Centurion', description: 'Use aquarium for 100 hours', icon: '💯', rarity: 'legendary' },
  { id: 'time-traveller', name: 'Time Traveller', description: 'See all time-of-day cycles', icon: '⏰', rarity: 'legendary' },
];

export interface UserAchievements {
  unlocked: string[];
  progress: Record<string, number>;
  stats: {
    totalTimeMs: number;
    screenshotsTaken: number;
    fishHovered: number;
    themesUsed: string[];
    sessionsCount: number;
  };
}

class AquariumAchievementsService {
  private storage: StorageAdapter;
  private userAchievements: UserAchievements = {
    unlocked: [],
    progress: {},
    stats: {
      totalTimeMs: 0,
      screenshotsTaken: 0,
      fishHovered: 0,
      themesUsed: [],
      sessionsCount: 0,
    },
  };

  constructor() {
    this.storage = StorageAdapter.UI;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<UserAchievements>('user');
    if (saved) {
      this.userAchievements = saved;
    }
    LOGGER.info('AquariumAchievements', `Initialized with ${this.userAchievements.unlocked.length} achievements`);
  }

  /**
   * Get all achievement definitions with unlock status
   */
  getAll(): Achievement[] {
    return ACHIEVEMENT_DEFINITIONS.map(def => ({
      ...def,
      unlockedAt: this.userAchievements.unlockedTimestamps?.[def.id] ?? (this.userAchievements.unlocked.includes(def.id) ? Date.now() : undefined),
      progress: this.userAchievements.progress[def.id],
    }));
  }

  /**
   * Get unlocked achievements
   */
  getUnlocked(): Achievement[] {
    return this.getAll().filter(a => a.unlockedAt);
  }

  /**
   * Get locked achievements
   */
  getLocked(): Achievement[] {
    return this.getAll().filter(a => !a.unlockedAt);
  }

  /**
   * Unlock achievement
   */
  async unlock(achievementId: string): Promise<boolean> {
    if (this.userAchievements.unlocked.includes(achievementId)) {
      return false; // Already unlocked
    }

    this.userAchievements.unlocked.push(achievementId);
    await this.save();

    const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
    eventBus.emit(EVENTS.ACHIEVEMENT_UNLOCKED, achievement);
    LOGGER.info('AquariumAchievements', 'Achievement unlocked', { id: achievementId });

    return true;
  }

  /**
   * Update progress
   */
  async updateProgress(achievementId: string, progress: number, max: number): Promise<void> {
    this.userAchievements.progress[achievementId] = progress;
    
    if (progress >= max && !this.userAchievements.unlocked.includes(achievementId)) {
      await this.unlock(achievementId);
    }

    await this.save();
  }

  /**
   * Track stat
   */
  async trackStat(stat: keyof UserAchievements['stats'], value: number | string): Promise<void> {
    const numericValue = typeof value === 'number' ? value : Number(value);
    switch (stat) {
      case 'screenshotsTaken':
        this.userAchievements.stats.screenshotsTaken = numericValue;
        if (numericValue >= 10) await this.checkAchievement('screenshot-pro');
        break;
      case 'fishHovered':
        this.userAchievements.stats.fishHovered = numericValue;
        if (numericValue >= 20) await this.checkAchievement('deep-dive');
        break;
      case 'themesUsed':
        if (!this.userAchievements.stats.themesUsed.includes(value as string)) {
          this.userAchievements.stats.themesUsed.push(value as string);
          if (this.userAchievements.stats.themesUsed.length >= 4) {
            await this.checkAchievement('theme-park');
          }
        }
        break;
      case 'totalTimeMs':
        this.userAchievements.stats.totalTimeMs = numericValue;
        if (numericValue >= 100 * 60 * 60 * 1000) await this.checkAchievement('centurion');
        break;
    }

    await this.save();
  }

  /**
   * Increment stat
   */
  async incrementStat(stat: keyof UserAchievements['stats']): Promise<void> {
    const current = this.userAchievements.stats[stat];
    if (typeof current === 'number') {
      await this.trackStat(stat, current + 1);
    }
  }

  private async checkAchievement(achievementId: string): Promise<void> {
    if (!this.userAchievements.unlocked.includes(achievementId)) {
      await this.unlock(achievementId);
    }
  }

  /**
   * Get user stats
   */
  getStats(): UserAchievements['stats'] {
    return { ...this.userAchievements.stats };
  }

  /**
   * Reset progress
   */
  async reset(): Promise<void> {
    this.userAchievements = {
      unlocked: [],
      progress: {},
      stats: {
        totalTimeMs: 0,
        screenshotsTaken: 0,
        fishHovered: 0,
        themesUsed: [],
        sessionsCount: 0,
      },
    };
    await this.save();
    LOGGER.info('AquariumAchievements', 'Progress reset');
  }

  private async save(): Promise<void> {
    await this.storage.set('user', this.userAchievements);
  }
}

// Singleton
export const aquariumAchievementsService = new AquariumAchievementsService();

// Add event
if (!EVENTS.ACHIEVEMENT_UNLOCKED) {
  (EVENTS as unknown as Record<string, string>).ACHIEVEMENT_UNLOCKED = 'achievement:unlocked';
}
