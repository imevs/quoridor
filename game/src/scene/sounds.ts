/**
 * Procedural audio synthesizer using the Web Audio API.
 * Generates wooden hops, hedge rustles, chimes, button clicks, and camera swooshes.
 * Zero external audio files required.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // AudioContext will be initialized on first user interaction
    const unlock = () => {
      this.initCtx();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch {
        /* audio disabled / unsupported */
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /** Soft organic wooden thud when a pawn hops to a new tile */
  playHop(): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /** Foliage snap / rustle when a hedge is placed */
  playWall(): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. Filtered white noise burst for foliage rustle
    const bufferSize = ctx.sampleRate * 0.16;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(2.5, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.17);

    // 2. Thump tone for the hedge thudding into the board groove
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  /** Joyful arpeggiated chime upon victory */
  playWin(): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.46);
    });
  }

  /** Subtle tick when hovering valid tiles or clicking controls */
  playTick(): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /** Gentle whoosh when undo or camera angle transitions */
  playWhoosh(): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.22);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.23);
  }
}

export const sounds = new SoundSystem();
