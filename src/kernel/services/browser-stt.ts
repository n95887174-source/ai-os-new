/**
 * Browser Speech-to-Text Service
 * Uses Web Speech API for voice transcription
 */

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

import { EventBus } from '../events/event-bus';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('BrowserSTT');

export interface STTOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export type STTState = 'idle' | 'listening' | 'processing' | 'error';

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

class BrowserSTTService {
  private recognition: SpeechRecognitionInstance | null = null;
  private state: STTState = 'idle';
  private isSupported = false;
  private currentTranscript = '';
  private listeners: Map<string, Set<(result: STTResult) => void>> = new Map();
  private errorListeners: Set<(error: string) => void> = new Set();
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private restartAttempts = 0;
  private readonly MAX_RESTART_ATTEMPTS = 10;
  private options: STTOptions = {
    lang: 'en-US',
    continuous: true,
    interimResults: true,
  };

  constructor() {
    this.init();
  }

  private init(): void {
    // Check for Web Speech API support
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
                              (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      LOGGER.warn('BrowserSTTService', 'SpeechRecognition not supported in this browser');
      this.isSupported = false;
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.isSupported = true;

      // Configure recognition
      this.recognition.lang = this.options.lang || 'en-US';
      this.recognition.continuous = this.options.continuous ?? true;
      this.recognition.interimResults = this.options.interimResults ?? true;
      this.recognition.maxAlternatives = 1;

      // Set up event handlers
      this.recognition.onstart = () => {
        this.restartAttempts = 0;
        this.state = 'listening';
        LOGGER.info('BrowserSTTService', 'Recognition started');
        EventBus.emit(EVENTS.STT_STATE_CHANGED, { state: this.state });
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const transcript = result[0].transcript;
          const isFinal = result.isFinal;
          const confidence = result[0].confidence;

          this.currentTranscript = transcript;

          const sttResult: STTResult = {
            transcript,
            isFinal,
            confidence,
          };

          // Notify listeners
          const stateListeners = this.listeners.get('result');
          if (stateListeners) {
            stateListeners.forEach(listener => listener(sttResult));
          }
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        let errorMessage: string;
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected';
            break;
          case 'audio-capture':
            errorMessage = 'No audio capture device found';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied';
            break;
          case 'network':
            errorMessage = 'Network error during speech recognition';
            break;
          case 'aborted':
            errorMessage = 'Recognition was aborted';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        this.state = 'error';
        LOGGER.error('BrowserSTTService', errorMessage, { error: event.error });
        EventBus.emit(EVENTS.STT_STATE_CHANGED, { state: this.state, error: errorMessage });
        EventBus.emit(EVENTS.STT_ERROR, { error: errorMessage });

        // Notify error listeners
        this.errorListeners.forEach(listener => listener(errorMessage));
      };

      this.recognition.onend = () => {
        if (this.state === 'listening') {
          if (this.restartAttempts < this.MAX_RESTART_ATTEMPTS) {
            this.restartAttempts++;
            LOGGER.warn('BrowserSTTService', 'Recognition ended unexpectedly, restarting...', { attempt: this.restartAttempts });
            this.restart();
          } else {
            LOGGER.error('BrowserSTTService', 'Max restart attempts reached, stopping');
            this.state = 'error';
            EventBus.emit(EVENTS.STT_STATE_CHANGED, { state: this.state, error: 'Max restart attempts reached' });
            EventBus.emit(EVENTS.STT_ERROR, { error: 'Max restart attempts reached' });
          }
        } else {
          this.state = 'idle';
          EventBus.emit(EVENTS.STT_STATE_CHANGED, { state: this.state });
        }
      };

      LOGGER.info('BrowserSTTService', 'Initialized successfully');
    } catch (e) {
      LOGGER.error('BrowserSTTService', 'Failed to initialize SpeechRecognition', { error: e });
      this.isSupported = false;
    }
  }

  /**
   * Check if STT is supported
   */
  isAvailable(): boolean {
    return this.isSupported;
  }

  /**
   * Start listening
   */
  start(options?: STTOptions): boolean {
    if (!this.recognition) {
      LOGGER.error('BrowserSTTService', 'Recognition not initialized');
      return false;
    }

    if (this.state === 'listening') {
      LOGGER.warn('BrowserSTTService', 'Already listening');
      return true;
    }

    try {
      // Apply options
      if (options?.lang) {
        this.recognition.lang = options.lang;
      }
      if (options?.continuous !== undefined) {
        this.recognition.continuous = options.continuous;
      }
      if (options?.interimResults !== undefined) {
        this.recognition.interimResults = options.interimResults;
      }

      this.recognition.start();
      LOGGER.info('BrowserSTTService', 'Starting recognition');
      return true;
    } catch (e) {
      LOGGER.error('BrowserSTTService', 'Failed to start recognition', { error: e });
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop(): string {
    if (!this.recognition || this.state !== 'listening') {
      return this.currentTranscript;
    }

    try {
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }
      this.restartAttempts = 0;
      this.recognition.stop();
      this.state = 'idle';
      LOGGER.info('BrowserSTTService', 'Recognition stopped');
      EventBus.emit(EVENTS.STT_STATE_CHANGED, { state: this.state });
    } catch (e) {
      LOGGER.error('BrowserSTTService', 'Failed to stop recognition', { error: e });
    }

    const transcript = this.currentTranscript;
    this.currentTranscript = '';
    return transcript;
  }

  /**
   * Abort recognition
   */
  abort(): void {
    if (!this.recognition) return;

    try {
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }
      this.restartAttempts = 0;
      this.recognition.abort();
      this.state = 'idle';
      this.currentTranscript = '';
      LOGGER.info('BrowserSTTService', 'Recognition aborted');
      EventBus.emit(EVENTS.STT_STATE_CHANGED, { state: this.state });
    } catch (e) {
      LOGGER.error('BrowserSTTService', 'Failed to abort recognition', { error: e });
    }
  }

  private restart(): void {
    if (this.state !== 'listening' || !this.recognition) return;
    const backoffMs = Math.min(100 * Math.pow(2, this.restartAttempts), 5000);

    try {
      this.restartTimer = setTimeout(() => {
        if (this.state === 'listening' && this.recognition) {
          this.recognition.start();
        }
      }, backoffMs);
    } catch (e) {
      LOGGER.error('BrowserSTTService', 'Failed to restart recognition', { error: e });
    }
  }

  /**
   * Get current state
   */
  getState(): STTState {
    return this.state;
  }

  /**
   * Get current interim transcript
   */
  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  /**
   * Subscribe to recognition results
   */
  onResult(callback: (result: STTResult) => void): () => void {
    if (!this.listeners.has('result')) {
      this.listeners.set('result', new Set());
    }
    this.listeners.get('result')!.add(callback);

    return () => {
      this.listeners.get('result')?.delete(callback);
    };
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (error: string) => void): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: STTState) => void): () => void {
    const wrapped = (data: { state: STTState }) => callback(data.state);
    EventBus.on(EVENTS.STT_STATE_CHANGED, wrapped as unknown as (...args: unknown[]) => void);
    return () => {
      EventBus.off(EVENTS.STT_STATE_CHANGED, wrapped as unknown as (...args: unknown[]) => void);
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    // Common languages - in production, this would query the browser
    return [
      'en-US', 'en-GB', 'en-AU',
      'ru-RU', 'ru',
      'de-DE', 'de',
      'fr-FR', 'fr',
      'es-ES', 'es',
      'it-IT', 'it',
      'pt-BR', 'pt',
      'zh-CN', 'zh-TW',
      'ja-JP', 'ko-KR',
      'ar-SA', 'hi-IN',
    ];
  }

  /**
   * Set language
   */
  setLanguage(lang: string): void {
    if (this.recognition) {
      this.recognition.lang = lang;
      this.options.lang = lang;
      LOGGER.info('BrowserSTTService', 'Language changed', { lang });
    }
  }

  /**
   * Destroy — clean up all resources
   */
  destroy(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.restartAttempts = 0;
    if (this.recognition) {
      try { this.recognition.abort(); } catch { LOGGER.warn('BrowserSTTService', 'Recognition abort failed'); }
      this.recognition = null;
    }
    this.listeners.clear();
    this.errorListeners.clear();
    this.state = 'idle';
    this.isSupported = false;
    LOGGER.info('BrowserSTTService', 'Destroyed');
  }
}

// Singleton instance
export const browserSTTService = new BrowserSTTService();

// H-18: Clean up event listeners on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    browserSTTService.destroy();
  });
}


