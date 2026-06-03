/**
 * Aquarium Audio Manager
 * Web Audio API wrapper for ambient sounds and event effects
 */

import { eventBus } from '../../../kernel/events/event-bus';
import { EVENTS } from '../../../kernel/events/event-names';
import { rootLogger } from '../../../kernel/services/logger-service';

const LOGGER = rootLogger.child('AquariumAudio');

export interface AudioSettings {
  masterVolume: number;      // 0-1
  ambientVolume: number;   // 0-1
  eventVolume: number;     // 0-1
  muted: boolean;
}

export type SoundEvent = 
  | 'success' 
  | 'error' 
  | 'rate-limit' 
  | 'provider-switch'
  | 'bubble'
  | 'feeding';

class AquariumAudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private eventGain: GainNode | null = null;
  private isInitialized = false;
  private settings: AudioSettings = {
    masterVolume: 0.5,
    ambientVolume: 0.3,
    eventVolume: 0.7,
    muted: false,
  };
  private activeOscillators: Map<string, OscillatorNode> = new Map();
  private noiseNode: AudioBufferSourceNode | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
      LOGGER.warn('AquariumAudioManager', 'Web Audio API not available');
      return;
    }

    try {
      this.audioContext = new AudioContext();
      
      // Create gain nodes
      this.masterGain = this.audioContext.createGain();
      this.ambientGain = this.audioContext.createGain();
      this.eventGain = this.audioContext.createGain();
      
      // Connect: ambient/event -> master -> destination
      this.ambientGain.connect(this.masterGain);
      this.eventGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
      
      // Apply initial volumes
      this.updateVolumes();
      
      // Resume on user interaction
      document.addEventListener('click', () => this.resume(), { once: true });
      document.addEventListener('keydown', () => this.resume(), { once: true });
      
      this.isInitialized = true;
      LOGGER.info('AquariumAudioManager', 'Initialized');
    } catch (e) {
      LOGGER.error('AquariumAudioManager', 'Failed to initialize', { error: e });
    }
  }

  /**
   * Resume audio context (required after user interaction)
   */
  private async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
      LOGGER.info('AquariumAudioManager', 'Audio context resumed');
    }
  }

  /**
   * Update volume levels
   */
  private updateVolumes(): void {
    if (!this.masterGain || !this.ambientGain || !this.eventGain) return;

    if (this.settings.muted) {
      this.masterGain.gain.value = 0;
    } else {
      this.masterGain.gain.value = this.settings.masterVolume;
    }
    
    this.ambientGain.gain.value = this.settings.ambientVolume;
    this.eventGain.gain.value = this.settings.eventVolume;
  }

  /**
   * Start ambient ocean sound
   */
  startAmbient(): void {
    if (!this.audioContext || !this.ambientGain) return;
    if (this.noiseNode) return; // Already playing

    try {
      // Create brown noise for ambient ocean sound
      const bufferSize = 2 * this.audioContext.sampleRate;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Amplify
      }
      
      this.noiseNode = this.audioContext.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;
      
      // Low-pass filter for muffled ocean sound
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      
      this.noiseNode.connect(filter);
      filter.connect(this.ambientGain);
      this.noiseNode.start();
      
      LOGGER.info('AquariumAudioManager', 'Ambient sound started');
    } catch (e) {
      LOGGER.error('AquariumAudioManager', 'Failed to start ambient', { error: e });
    }
  }

  /**
   * Stop ambient sound
   */
  stopAmbient(): void {
    if (this.noiseNode) {
      this.noiseNode.stop();
      this.noiseNode.disconnect();
      this.noiseNode = null;
      LOGGER.info('AquariumAudioManager', 'Ambient sound stopped');
    }
  }

  /**
   * Play bubble sound effect
   */
  playBubble(): void {
    if (!this.audioContext || !this.eventGain || this.settings.muted) return;

    const now = this.audioContext.currentTime;
    
    // Create oscillator for bubble pop
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.eventGain);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Play success sound
   */
  playSuccess(): void {
    if (!this.audioContext || !this.eventGain || this.settings.muted) return;

    const now = this.audioContext.currentTime;
    
    // Pleasant ascending tone
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.setValueAtTime(0.2, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.connect(gain);
    gain.connect(this.eventGain);
    
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Play error sound
   */
  playError(): void {
    if (!this.audioContext || !this.eventGain || this.settings.muted) return;

    const now = this.audioContext.currentTime;
    
    // Descending tone for error
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.connect(gain);
    gain.connect(this.eventGain);
    
    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Play rate limit sound
   */
  playRateLimit(): void {
    if (!this.audioContext || !this.eventGain || this.settings.muted) return;

    const now = this.audioContext.currentTime;
    
    // Multiple short beeps
    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'square';
      osc.frequency.value = 880;
      
      const startTime = now + i * 0.15;
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
      
      osc.connect(gain);
      gain.connect(this.eventGain);
      
      osc.start(startTime);
      osc.stop(startTime + 0.08);
    }
  }

  /**
   * Play provider switch sound
   */
  playProviderSwitch(): void {
    if (!this.audioContext || !this.eventGain || this.settings.muted) return;

    const now = this.audioContext.currentTime;
    
    // Whoosh sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    osc.connect(gain);
    gain.connect(this.eventGain);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Play feeding sound
   */
  playFeeding(): void {
    if (!this.audioContext || !this.eventGain || this.settings.muted) return;

    const now = this.audioContext.currentTime;
    
    // Short crisp clicks
    for (let i = 0; i < 5; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = 1200 + Math.random() * 200;
      
      const startTime = now + i * 0.05;
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);
      
      osc.connect(gain);
      gain.connect(this.eventGain);
      
      osc.start(startTime);
      osc.stop(startTime + 0.03);
    }
  }

  /**
   * Play event sound
   */
  playSound(event: SoundEvent): void {
    switch (event) {
      case 'success':
        this.playSuccess();
        break;
      case 'error':
        this.playError();
        break;
      case 'rate-limit':
        this.playRateLimit();
        break;
      case 'provider-switch':
        this.playProviderSwitch();
        break;
      case 'bubble':
        this.playBubble();
        break;
      case 'feeding':
        this.playFeeding();
        break;
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  /**
   * Set ambient volume
   */
  setAmbientVolume(volume: number): void {
    this.settings.ambientVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  /**
   * Set event volume
   */
  setEventVolume(volume: number): void {
    this.settings.eventVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  /**
   * Toggle mute
   */
  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.updateVolumes();
    if (muted) {
      this.stopAmbient();
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Check if audio is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.audioContext !== null;
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.stopAmbient();
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    this.activeOscillators.clear();
    this.audioContext?.close();
    this.audioContext = null;
    this.isInitialized = false;
    LOGGER.info('AquariumAudioManager', 'Destroyed');
  }
}

// Singleton instance
export const aquariumAudioManager = new AquariumAudioManager();