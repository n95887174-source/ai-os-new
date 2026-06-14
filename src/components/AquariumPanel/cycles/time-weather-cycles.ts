/**
 * Time-of-Day & Weather Cycles for Aquarium
 * Dynamic environmental effects based on time and weather
 */

import { rootLogger } from '../../../kernel/services/logger-service';

const LOGGER = rootLogger.child('AquariumCycles');

export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'dusk' | 'night' | 'midnight';
export type WeatherType = 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'foggy' | 'snowy';

export interface TimeCycleConfig {
  dawnStart: number;      // Hour (0-24)
  morningStart: number;
  noonStart: number;
  afternoonStart: number;
  eveningStart: number;
  duskStart: number;
  nightStart: number;
  midnightStart: number;
}

export interface WeatherCycleConfig {
  clearDuration: number;  // Minutes
  cloudyDuration: number;
  rainyDuration: number;
  stormyDuration: number;
  foggyDuration: number;
  transitionDuration: number;
}

export interface CycleState {
  timeOfDay: TimeOfDay;
  hour: number;
  weather: WeatherType;
  transitionProgress: number; // 0-1 during transitions
  intensity: number; // 0-1
}

export interface VisualEffects {
  ambientLight: string;      // CSS color
  backgroundGradient: string;
  overlayColor: string;
  overlayOpacity: number;
  particleType: 'none' | 'bubbles' | 'rain' | 'snow' | 'fog';
  particleIntensity: number;
  glowColor: string;
  glowIntensity: number;
  shadowColor: string;
  shadowBlur: number;
}

const DEFAULT_TIME_CONFIG: TimeCycleConfig = {
  dawnStart: 5,
  morningStart: 7,
  noonStart: 11,
  afternoonStart: 14,
  eveningStart: 17,
  duskStart: 19,
  nightStart: 21,
  midnightStart: 0,
};

const DEFAULT_WEATHER_CONFIG: WeatherCycleConfig = {
  clearDuration: 20,
  cloudyDuration: 10,
  rainyDuration: 8,
  stormyDuration: 3,
  foggyDuration: 5,
  transitionDuration: 2,
};

// Time period visual configurations
const TIME_VISUALS: Record<TimeOfDay, Partial<VisualEffects>> = {
  dawn: {
    ambientLight: '#ff9a56',
    backgroundGradient: 'linear-gradient(180deg, #ff7b54 0%, #ffb347 50%, #87ceeb 100%)',
    overlayColor: '#ffcc99',
    overlayOpacity: 0.15,
    glowColor: '#ff9a56',
    glowIntensity: 0.3,
  },
  morning: {
    ambientLight: '#ffd89b',
    backgroundGradient: 'linear-gradient(180deg, #87ceeb 0%, #b0e0e6 50%, #f0f8ff 100%)',
    overlayColor: '#fff8dc',
    overlayOpacity: 0.1,
    glowColor: '#ffd700',
    glowIntensity: 0.4,
  },
  noon: {
    ambientLight: '#87ceeb',
    backgroundGradient: 'linear-gradient(180deg, #4a90d9 0%, #87ceeb 50%, #b0e0e6 100%)',
    overlayColor: '#ffffff',
    overlayOpacity: 0.05,
    glowColor: '#ffffff',
    glowIntensity: 0.6,
  },
  afternoon: {
    ambientLight: '#e6f3ff',
    backgroundGradient: 'linear-gradient(180deg, #87ceeb 0%, #b0e0e6 50%, #f5f5dc 100%)',
    overlayColor: '#fffacd',
    overlayOpacity: 0.08,
    glowColor: '#ffd700',
    glowIntensity: 0.5,
  },
  evening: {
    ambientLight: '#ff6b6b',
    backgroundGradient: 'linear-gradient(180deg, #ff6b6b 0%, #ffa07a 50%, #708090 100%)',
    overlayColor: '#ffb6c1',
    overlayOpacity: 0.2,
    glowColor: '#ff4500',
    glowIntensity: 0.4,
  },
  dusk: {
    ambientLight: '#9966cc',
    backgroundGradient: 'linear-gradient(180deg, #4b0082 0%, #8a2be2 30%, #ff6b6b 70%, #ffa07a 100%)',
    overlayColor: '#dda0dd',
    overlayOpacity: 0.25,
    glowColor: '#ff00ff',
    glowIntensity: 0.3,
  },
  night: {
    ambientLight: '#191970',
    backgroundGradient: 'linear-gradient(180deg, #0a0a2e 0%, #191970 50%, #2e2e5e 100%)',
    overlayColor: '#000033',
    overlayOpacity: 0.4,
    particleType: 'bubbles',
    particleIntensity: 0.2,
    glowColor: '#4169e1',
    glowIntensity: 0.5,
    shadowColor: '#000033',
    shadowBlur: 30,
  },
  midnight: {
    ambientLight: '#0d0d1a',
    backgroundGradient: 'linear-gradient(180deg, #000000 0%, #0a0a1a 50%, #0d0d2e 100%)',
    overlayColor: '#00001a',
    overlayOpacity: 0.5,
    particleType: 'bubbles',
    particleIntensity: 0.15,
    glowColor: '#1e90ff',
    glowIntensity: 0.3,
    shadowColor: '#000000',
    shadowBlur: 40,
  },
};

// Weather visual configurations
const WEATHER_VISUALS: Record<WeatherType, Partial<VisualEffects>> = {
  clear: {
    particleType: 'none',
    particleIntensity: 0,
    overlayOpacity: 0,
  },
  cloudy: {
    ambientLight: '#a9a9a9',
    backgroundGradient: 'linear-gradient(180deg, #696969 0%, #808080 50%, #a9a9a9 100%)',
    overlayColor: '#d3d3d3',
    overlayOpacity: 0.3,
    particleType: 'none',
    particleIntensity: 0,
  },
  rainy: {
    ambientLight: '#708090',
    backgroundGradient: 'linear-gradient(180deg, #4a4a4a 0%, #696969 50%, #808080 100%)',
    overlayColor: '#b0c4de',
    overlayOpacity: 0.4,
    particleType: 'rain',
    particleIntensity: 0.6,
    glowColor: '#add8e6',
    glowIntensity: 0.2,
  },
  stormy: {
    ambientLight: '#2f4f4f',
    backgroundGradient: 'linear-gradient(180deg, #1a1a2e 0%, #2f4f4f 50%, #4a4a4a 100%)',
    overlayColor: '#000033',
    overlayOpacity: 0.6,
    particleType: 'rain',
    particleIntensity: 1,
    glowColor: '#ffff00',
    glowIntensity: 0.8,
    shadowColor: '#000000',
    shadowBlur: 20,
  },
  foggy: {
    ambientLight: '#c9c9c9',
    backgroundGradient: 'linear-gradient(180deg, #d3d3d3 0%, #c9c9c9 50%, #b8b8b8 100%)',
    overlayColor: '#e8e8e8',
    overlayOpacity: 0.7,
    particleType: 'fog',
    particleIntensity: 0.8,
    glowColor: '#ffffff',
    glowIntensity: 0.1,
  },
  snowy: {
    ambientLight: '#f0f8ff',
    backgroundGradient: 'linear-gradient(180deg, #e8e8e8 0%, #f0f8ff 50%, #ffffff 100%)',
    overlayColor: '#ffffee',
    overlayOpacity: 0.5,
    particleType: 'snow',
    particleIntensity: 0.7,
    glowColor: '#ffffff',
    glowIntensity: 0.4,
  },
};

export class TimeWeatherCycles {
  private timeConfig: TimeCycleConfig;
  private weatherConfig: WeatherCycleConfig;
  private state: CycleState;
  private listeners: Set<(state: CycleState, effects: VisualEffects) => void> = new Set();
  private lastUpdate: number = 0;
  private weatherTimer: number = 0;
  private currentWeatherDuration: number = 0;

  constructor(
    timeConfig: Partial<TimeCycleConfig> = {},
    weatherConfig: Partial<WeatherCycleConfig> = {}
  ) {
    this.timeConfig = { ...DEFAULT_TIME_CONFIG, ...timeConfig };
    this.weatherConfig = { ...DEFAULT_WEATHER_CONFIG, ...weatherConfig };
    
    const hour = new Date().getHours();
    this.state = {
      timeOfDay: this.getTimeOfDay(hour),
      hour,
      weather: 'clear',
      transitionProgress: 0,
      intensity: 1,
    };

    this.weatherTimer = Date.now();
    this.currentWeatherDuration = this.weatherConfig.clearDuration * 60 * 1000;
  }

  /**
   * Start the cycle system
   */
  start(): void {
    this.lastUpdate = Date.now();
    this.update();
    LOGGER.info('TimeWeatherCycles', 'Started', { timeOfDay: this.state.timeOfDay, weather: this.state.weather });
  }

  /**
   * Update cycle state (call every frame)
   */
  update(): void {
    const now = Date.now();
    const elapsed = now - this.lastUpdate;
    this.lastUpdate = now;

    // Update time of day
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const newTimeOfDay = this.getTimeOfDay(hour);

    if (newTimeOfDay !== this.state.timeOfDay) {
      this.state.transitionProgress = 1;
      this.state.timeOfDay = newTimeOfDay;
    } else if (this.state.transitionProgress > 0) {
      this.state.transitionProgress = Math.max(0, this.state.transitionProgress - elapsed / 3000);
    }

    this.state.hour = hour;

    // Update weather
    this.weatherTimer += elapsed;
    if (this.weatherTimer >= this.currentWeatherDuration) {
      this.advanceWeather();
    }

    // Emit updates
    const effects = this.getVisualEffects();
    this.notifyListeners(effects);
  }

  /**
   * Get current state
   */
  getState(): CycleState {
    return { ...this.state };
  }

  /**
   * Get visual effects for current state
   */
  getVisualEffects(): VisualEffects {
    const timeEffects = TIME_VISUALS[this.state.timeOfDay] || TIME_VISUALS.night;
    const weatherEffects = WEATHER_VISUALS[this.state.weather] || WEATHER_VISUALS.clear;

    const transitionBlend = this.state.transitionProgress;
    const intensity = this.state.intensity;

    return {
      ambientLight: weatherEffects.ambientLight || timeEffects.ambientLight || '#000000',
      backgroundGradient: timeEffects.backgroundGradient || 'linear-gradient(180deg, #000000 0%, #000000 100%)',
      overlayColor: transitionBlend > 0 
        ? this.blendColors(timeEffects.overlayColor || '#000000', weatherEffects.overlayColor || '#000000', transitionBlend)
        : (timeEffects.overlayColor || '#000000'),
      overlayOpacity: (transitionBlend > 0 ? (timeEffects.overlayOpacity || 0) * (1 - transitionBlend) + (weatherEffects.overlayOpacity || 0) * transitionBlend : (timeEffects.overlayOpacity || 0)) * intensity,
      particleType: transitionBlend > 0.5 ? (weatherEffects.particleType || 'none') : (timeEffects.particleType || 'none'),
      particleIntensity: (transitionBlend > 0.5 ? (weatherEffects.particleIntensity || 0) : (timeEffects.particleIntensity || 0)) * intensity,
      glowColor: weatherEffects.glowColor || timeEffects.glowColor || '#ffffff',
      glowIntensity: (weatherEffects.glowIntensity || timeEffects.glowIntensity || 0) * intensity,
      shadowColor: weatherEffects.shadowColor || timeEffects.shadowColor || '#000000',
      shadowBlur: (weatherEffects.shadowBlur || timeEffects.shadowBlur || 0) * intensity,
    };
  }

  /**
   * Get time progress within current period (0-1)
   */
  getTimeProgress(): number {
    const hour = this.state.hour;
    const nextTime = this.getNextTimeStart(this.state.timeOfDay);
    const currentStart = this.getCurrentTimeStart(this.state.timeOfDay);
    return (hour - currentStart) / (nextTime - currentStart);
  }

  /**
   * Subscribe to cycle changes
   */
  subscribe(callback: (state: CycleState, effects: VisualEffects) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Set weather manually
   */
  setWeather(weather: WeatherType): void {
    this.state.weather = weather;
    this.weatherTimer = 0;
    this.currentWeatherDuration = this.getWeatherDuration(weather) * 60 * 1000;
    LOGGER.info('TimeWeatherCycles', 'Weather set', { weather });
  }

  /**
   * Set intensity
   */
  setIntensity(intensity: number): void {
    this.state.intensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Set time manually
   */
  setTime(hour: number): void {
    this.state.hour = hour;
    this.state.timeOfDay = this.getTimeOfDay(hour);
    this.state.transitionProgress = 1;
  }

  /**
   * Get all available time of day options
   */
  getTimeOptions(): TimeOfDay[] {
    return ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'dusk', 'night', 'midnight'];
  }

  /**
   * Get all available weather options
   */
  getWeatherOptions(): WeatherType[] {
    return ['clear', 'cloudy', 'rainy', 'stormy', 'foggy', 'snowy'];
  }

  private getTimeOfDay(hour: number): TimeOfDay {
    if (hour >= this.timeConfig.dawnStart && hour < this.timeConfig.morningStart) return 'dawn';
    if (hour >= this.timeConfig.morningStart && hour < this.timeConfig.noonStart) return 'morning';
    if (hour >= this.timeConfig.noonStart && hour < this.timeConfig.afternoonStart) return 'noon';
    if (hour >= this.timeConfig.afternoonStart && hour < this.timeConfig.eveningStart) return 'afternoon';
    if (hour >= this.timeConfig.eveningStart && hour < this.timeConfig.duskStart) return 'evening';
    if (hour >= this.timeConfig.duskStart && hour < this.timeConfig.nightStart) return 'dusk';
    if (hour >= this.timeConfig.midnightStart && hour < this.timeConfig.dawnStart) return 'midnight';
    if (hour >= this.timeConfig.nightStart) return 'night';
    return 'night';
  }

  private getCurrentTimeStart(timeOfDay: TimeOfDay): number {
    const map: Record<TimeOfDay, number> = {
      dawn: this.timeConfig.dawnStart,
      morning: this.timeConfig.morningStart,
      noon: this.timeConfig.noonStart,
      afternoon: this.timeConfig.afternoonStart,
      evening: this.timeConfig.eveningStart,
      dusk: this.timeConfig.duskStart,
      night: this.timeConfig.nightStart,
      midnight: this.timeConfig.midnightStart,
    };
    return map[timeOfDay];
  }

  private getNextTimeStart(timeOfDay: TimeOfDay): number {
    const order: TimeOfDay[] = ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'dusk', 'night', 'midnight'];
    const idx = order.indexOf(timeOfDay);
    const next = (idx + 1) % order.length;
    return this.getCurrentTimeStart(order[next]);
  }

  private advanceWeather(): void {
    const weathers: WeatherType[] = ['clear', 'cloudy', 'rainy', 'stormy', 'foggy'];
    const currentIdx = weathers.indexOf(this.state.weather);
    const nextIdx = (currentIdx + 1) % weathers.length;
    this.state.weather = weathers[nextIdx];
    this.weatherTimer = 0;
    this.currentWeatherDuration = this.getWeatherDuration(this.state.weather) * 60 * 1000;
    this.state.transitionProgress = 1;
    LOGGER.info('TimeWeatherCycles', 'Weather advanced', { weather: this.state.weather });
  }

  private getWeatherDuration(weather: WeatherType): number {
    const map: Record<WeatherType, number> = {
      clear: this.weatherConfig.clearDuration,
      cloudy: this.weatherConfig.cloudyDuration,
      rainy: this.weatherConfig.rainyDuration,
      stormy: this.weatherConfig.stormyDuration,
      foggy: this.weatherConfig.foggyDuration,
      snowy: 4,
    };
    return map[weather];
  }

  private blendColors(color1: string, color2: string, t: number): string {
    // Simple hex color blending
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    
    const r = Math.round(c1.r * (1 - t) + c2.r * t);
    const g = Math.round(c1.g * (1 - t) + c2.g * t);
    const b = Math.round(c1.b * (1 - t) + c2.b * t);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 };
  }

  private notifyListeners(effects: VisualEffects): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state, effects);
      } catch (e) {
        LOGGER.error('TimeWeatherCycles', 'Listener error', { error: e });
      }
    }
  }
}

// Singleton
export const timeWeatherCycles = new TimeWeatherCycles();