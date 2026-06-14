export interface AudioConfig {
  masterVolume: number;
  ambientVolume: number;
  eventVolume: number;
  muted: boolean;
}

const DEFAULT_CONFIG: AudioConfig = { masterVolume: 0.3, ambientVolume: 0.2, eventVolume: 0.5, muted: false };

export class AudioManager {
  private ctx: AudioContext | null = null;
  private config: AudioConfig = { ...DEFAULT_CONFIG };
  private ambientSource: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  private getCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try { this.ctx = new AudioContext(); return this.ctx; } catch { return null; }
  }

  setConfig(patch: Partial<AudioConfig>): void {
    Object.assign(this.config, patch);
    this.updateGain();
  }

  getConfig(): AudioConfig { return { ...this.config }; }

  private updateGain(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = this.config.muted ? 0 : this.config.masterVolume;
    }
  }

  startAmbient(): void {
    if (this.config.muted) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    if (this.ambientSource) return;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = this.config.ambientVolume;
    this.gainNode.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 80;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 120;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 20;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    osc1.connect(this.gainNode);
    osc2.connect(this.gainNode);

    lfo.start();
    osc1.start();
    osc2.start();

    this.ambientSource = osc1;
    (this as unknown as { _osc2: OscillatorNode })._osc2 = osc2;
    (this as unknown as { _lfo: OscillatorNode })._lfo = lfo;
  }

  stopAmbient(): void {
    try {
      this.ambientSource?.stop();
      this.ambientSource?.disconnect();
      const osc2 = (this as unknown as { _osc2?: OscillatorNode })._osc2;
      osc2?.stop();
      osc2?.disconnect();
      const lfo = (this as unknown as { _lfo?: OscillatorNode })._lfo;
      lfo?.stop();
      lfo?.disconnect();
    } catch { /* already stopped */ }
    this.ambientSource = null;
    (this as unknown as { _osc2?: OscillatorNode })._osc2 = undefined;
    (this as unknown as { _lfo?: OscillatorNode })._lfo = undefined;
  }

  playEvent(type: 'bubble' | 'splash' | 'whoosh' | 'success'): void {
    if (this.config.muted) return;
    const ctx = this.getCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'bubble': osc.type = 'sine'; osc.frequency.value = 400; gain.gain.value = 0.15; break;
      case 'splash': osc.type = 'sawtooth'; osc.frequency.value = 150; gain.gain.value = 0.1; break;
      case 'whoosh': osc.type = 'triangle'; osc.frequency.value = 200; gain.gain.value = 0.1; break;
      case 'success': osc.type = 'sine'; osc.frequency.value = 523; gain.gain.value = 0.15; break;
    }

    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  destroy(): void {
    this.stopAmbient();
    this.ctx?.close();
    this.ctx = null;
  }
}
