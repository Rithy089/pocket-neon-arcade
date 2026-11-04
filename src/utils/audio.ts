// Procedural Web Audio 2.0 Engine for Pocket Neon Arcade
// Zero external audio files: 100% synthesized oscillators, white noise, and scheduled synthwave bassline.

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isSfxEnabled: boolean = true;
  private isBgmEnabled: boolean = true;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;

  // Synthwave BGM Sequencer state
  private isBgmPlaying: boolean = false;
  private bgmTimerId: number | null = null;
  private currentStep: number = 0;
  private nextNoteTime: number = 0;
  private tempo: number = 120;
  private bgmIntensity: 'normal' | 'boss' | 'overdrive' = 'normal';

  // Pentatonic scale frequency ratios for combo hits
  private readonly pentatonicRatios = [
    1.0,        // Root (e.g. 440)
    1.125,      // Major 2nd
    1.25,       // Major 3rd
    1.5,        // Perfect 5th
    1.667,      // Major 6th
    2.0,        // Octave
    2.25,
    2.5,
    3.0,
    3.333,
    4.0,
    4.5,
    5.0,
    6.0,
    6.667,
    8.0
  ];

  constructor() {
    // Initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      try { this.ctx = new AudioCtxClass(); } catch { return; }

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.isSfxEnabled ? 0.85 : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // BGM Bus & Filter
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.isBgmEnabled ? 0.35 : 0, this.ctx.currentTime);

      this.bgmFilter = this.ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
      this.bgmFilter.Q.setValueAtTime(4, this.ctx.currentTime);

      this.bgmFilter.connect(this.bgmGain);
      this.bgmGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setSfxEnabled(enabled: boolean) {
    this.isSfxEnabled = enabled;
    if (this.sfxGain && this.ctx) this.sfxGain.gain.setValueAtTime(enabled ? .85 : 0, this.ctx.currentTime);
  }

  public setBgmEnabled(enabled: boolean) {
    this.isBgmEnabled = enabled;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(enabled ? 0.35 : 0, this.ctx.currentTime);
    }
    if (!enabled && this.isBgmPlaying) {
      this.stopBgm();
    }
  }

  public getBgmEnabled(): boolean {
    return this.isBgmEnabled;
  }

  public setBgmIntensity(intensity: 'normal' | 'boss' | 'overdrive') {
    this.bgmIntensity = intensity;
    if (!this.ctx || !this.bgmFilter) return;

    const t = this.ctx.currentTime;
    let cutoff = 380;
    if (intensity === 'boss') cutoff = 950;
    if (intensity === 'overdrive') cutoff = 1800;

    this.bgmFilter.frequency.cancelScheduledValues(t);
    this.bgmFilter.frequency.exponentialRampToValueAtTime(Math.max(50, cutoff), t + 0.5);
  }

  // --- PROCEDURAL SYNTHWAVE BASSLINE SCHEDULER ---
  public startBgm() {
    this.initCtx();
    if (!this.ctx || !this.isBgmEnabled || this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.currentStep = 0;
    this.scheduleBgmLoop();
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimerId !== null) {
      window.clearTimeout(this.bgmTimerId);
      this.bgmTimerId = null;
    }
  }

  private scheduleBgmLoop = () => {
    if (!this.isBgmPlaying || !this.ctx || !this.bgmFilter) return;

    const secondsPerBeat = 60.0 / this.tempo;
    const stepDuration = secondsPerBeat / 4; // 16th notes
    const lookahead = 0.1; // 100ms lookahead

    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this.playSynthBassStep(this.nextNoteTime, this.currentStep);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 16;
    }

    this.bgmTimerId = window.setTimeout(this.scheduleBgmLoop, 25);
  };

  private playSynthBassStep(time: number, step: number) {
    if (!this.ctx || !this.bgmFilter) return;

    // 16-step Cyberpunk Bass Pattern in D Minor (D1, D2, F1, G1, A1, C2)
    // Notes in Hz: D1=36.71, D2=73.42, F1=43.65, G1=49.00, A1=55.00, C2=65.41
    const bassPattern = [
      73.42, 73.42, 146.83, 73.42,
      73.42, 87.31, 73.42, 98.00,
      73.42, 73.42, 146.83, 73.42,
      110.00, 98.00, 87.31, 65.41
    ];

    const freq = bassPattern[step];
    const isAccent = step % 4 === 0;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.bgmIntensity === 'overdrive' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const dur = 0.11;
    const noteGain = isAccent ? 0.32 : 0.22;
    gain.gain.setValueAtTime(noteGain, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.bgmFilter);

    osc.start(time);
    osc.stop(time + dur);

    // Subtle hi-hat / cymbal tick on off-beats during Boss or Overdrive
    if (this.bgmIntensity !== 'normal' && (step % 2 === 1)) {
      this.playHiHatTick(time);
    }
  }

  private playHiHatTick(time: number) {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.02);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(time);
  }

  // --- SOUND EFFECTS ---

  public playUiBeep() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, t);
    gain.gain.setValueAtTime(.14, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .055);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(t); osc.stop(t + .06);
  }

  // Coin insertion sound (authentic retro twin-tone chime)
  public playCoin() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587, t);
    osc.frequency.setValueAtTime(880, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Paddle bounce: clean crisp retro blip
  public playPaddleBounce() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.06);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Wall bounce: lower soft synth bump
  public playWallBounce() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.05);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Brick hit / crunch with musical Pentatonic Scale pitch escalation!
  public playBrickHit(isArmored = false, comboCount = 0) {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isArmored ? 'sawtooth' : 'square';

    const ratioIndex = Math.min(comboCount, this.pentatonicRatios.length - 1);
    const scaleRatio = this.pentatonicRatios[ratioIndex];
    const baseFreq = isArmored ? 220 : 380;
    const targetFreq = baseFreq * scaleRatio;

    osc.frequency.setValueAtTime(targetFreq, t);
    osc.frequency.exponentialRampToValueAtTime(isArmored ? targetFreq * 0.7 : targetFreq * 1.3, t + 0.07);

    gain.gain.setValueAtTime(isArmored ? 0.35 : 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Layered dual-stage explosion: Filtered white noise burst + Pitch-dropping Sine sub-bass (130Hz -> 32Hz)
  public playExplosion(heavy = false) {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const dur = heavy ? 0.38 : 0.24;

    // 1. Noise Burst
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(heavy ? 1200 : 850, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(60, t + dur);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(heavy ? 0.6 : 0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);

    // 2. Sub-bass Sine Drop (Tactile Thump)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(heavy ? 150 : 125, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + dur);

    subGain.gain.setValueAtTime(heavy ? 0.65 : 0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(t);
    subOsc.stop(t + dur);
  }

  // Laser beam shot
  public playLaser(isPlasma = false) {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isPlasma ? 1400 : 1100, t);
    osc.frequency.exponentialRampToValueAtTime(isPlasma ? 120 : 220, t + (isPlasma ? 0.15 : 0.1));

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isPlasma ? 0.15 : 0.1));

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + (isPlasma ? 0.15 : 0.1));
  }

  // Powerup collected (triumphant arpeggio)
  public playPowerup() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = t + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.1);
    });
  }

  // Collect Neon Shard chime (clean crystalline ping)
  public playShardCollect() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t); // A6
    osc.frequency.exponentialRampToValueAtTime(2093, t + 0.07); // C7

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Overdrive Activation Hyper Whoosh
  public playOverdriveTrigger() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.4);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  // Shield deflection / forcefield absorption
  public playShieldDeflect() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.linearRampToValueAtTime(240, t + 0.15);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Combo multiplier popup chime
  public playCombo(comboCount: number) {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const basePitch = Math.min(1800, 440 + comboCount * 70);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(basePitch, t);
    osc.frequency.exponentialRampToValueAtTime(basePitch * 1.35, t + 0.1);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Achievement unlocked fanfare
  public playAchievement() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [659.25, 783.99, 1046.5, 1318.51]; // E5, G5, C6, E6
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = t + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.18);
    });
  }

  // Life lost
  public playLifeLost() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.35);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Game over theme
  public playGameOver() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [392, 311.13, 261.63]; // G, Eb, C: descending C minor triad
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = t + idx * 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.65);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.7);
    });
  }

  // Wave clear triumphant victory jingle
  public playLevelClear() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = t + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  }

  // Grand arcade victory anthem
  public playGameWin() {
    if (this.isMuted || !this.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const fanfare = [
      { freq: 523.25, dur: 0.12, type: 'triangle' as OscillatorType },
      { freq: 659.25, dur: 0.12, type: 'triangle' as OscillatorType },
      { freq: 783.99, dur: 0.12, type: 'triangle' as OscillatorType },
      { freq: 1046.5, dur: 0.22, type: 'triangle' as OscillatorType },
      { freq: 880.0, dur: 0.12, type: 'square' as OscillatorType },
      { freq: 1046.5, dur: 0.14, type: 'square' as OscillatorType },
      { freq: 1174.66, dur: 0.16, type: 'square' as OscillatorType },
      { freq: 1318.51, dur: 0.5, type: 'triangle' as OscillatorType }
    ];

    let t = this.ctx.currentTime + 0.05;
    fanfare.forEach((note) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + note.dur);

      t += note.dur * 0.88;
    });
  }
}

export const soundManager = new SoundManager();
