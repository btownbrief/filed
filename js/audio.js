// FILED! — procedural Web Audio sound effects. No external assets.

const LS_MUTE = 'filed.muted';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = localStorage.getItem(LS_MUTE) === '1';
    this._noiseBuf = null;
  }

  // Must be called from a user gesture at least once.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      // 1s of white noise, reused by every effect
      const len = this.ctx.sampleRate;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem(LS_MUTE, m ? '1' : '0');
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.value = m ? 0 : 0.9;
    }
  }

  get t() { return this.ctx.currentTime; }

  _noise(dur, { type = 'lowpass', freq = 1000, q = 1, gain = 0.5, sweepTo = null, attack = 0.002 } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, this.t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t);
    g.gain.exponentialRampToValueAtTime(gain, this.t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(this.t, Math.random());
    src.stop(this.t + dur + 0.05);
  }

  _tone(freq, dur, { type = 'sine', gain = 0.3, slideTo = null, attack = 0.003, delay = 0 } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    const start = this.t + delay;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  ready() { return !!this.ctx && !this.muted; }

  // The big rubber stamp: thump + click + paper snap. Slight pitch variance.
  stamp(intensity = 1) {
    if (!this.ready()) return;
    const v = 0.9 + Math.random() * 0.2;
    this._tone(120 * v, 0.09, { type: 'sine', gain: 0.5 * intensity, slideTo: 45 });
    this._noise(0.05, { type: 'bandpass', freq: 2600 * v, q: 1.2, gain: 0.22 * intensity });
    this._noise(0.11, { type: 'lowpass', freq: 700 * v, gain: 0.3 * intensity });
  }

  // Metal drawer sliding shut on a successful clear
  drawerClack() {
    if (!this.ready()) return;
    this._noise(0.06, { type: 'highpass', freq: 1800, gain: 0.1 });
    this._tone(210 + Math.random() * 40, 0.05, { type: 'triangle', gain: 0.12, slideTo: 150 });
  }

  // Little paper flutter for label popups
  flutter() {
    if (!this.ready()) return;
    this._noise(0.16, { type: 'bandpass', freq: 3800, q: 2.5, gain: 0.08, sweepTo: 1400 });
  }

  // Milestone office bell: ding-ding!
  ding() {
    if (!this.ready()) return;
    for (const [f, d] of [[1318.5, 0], [1760, 0.02]]) {
      this._tone(f, 0.5, { type: 'sine', gain: 0.14, delay: d, attack: 0.001 });
      this._tone(f * 2.71, 0.22, { type: 'sine', gain: 0.05, delay: d, attack: 0.001 });
    }
  }

  // Crushed by an open drawer: metal slam + burst of paper + sad slide
  death() {
    if (!this.ready()) return;
    this._tone(90, 0.28, { type: 'sawtooth', gain: 0.4, slideTo: 30 });
    this._noise(0.32, { type: 'lowpass', freq: 1200, gain: 0.5, sweepTo: 180 });
    this._noise(0.5, { type: 'bandpass', freq: 4200, q: 1.6, gain: 0.16, sweepTo: 900, attack: 0.02 });
    this._tone(392, 0.6, { type: 'square', gain: 0.06, slideTo: 98, delay: 0.18 });
  }

  // Out of time: wilting trombone-ish womp
  timeout() {
    if (!this.ready()) return;
    this._tone(220, 0.5, { type: 'sawtooth', gain: 0.18, slideTo: 110 });
    this._tone(223, 0.5, { type: 'sawtooth', gain: 0.18, slideTo: 108 });
    this._noise(0.6, { type: 'bandpass', freq: 3000, q: 2, gain: 0.1, sweepTo: 600, attack: 0.05 });
  }

  // UI select blip
  blip() {
    if (!this.ready()) return;
    this._tone(660, 0.08, { type: 'square', gain: 0.08, slideTo: 990 });
  }

  // New best fanfare
  fanfare() {
    if (!this.ready()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this._tone(f, 0.28, { type: 'triangle', gain: 0.13, delay: i * 0.09 }));
  }
}

export const sound = new SoundEngine();
