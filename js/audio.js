// Original procedural textures; no recordings or remote audio assets.
export function noiseSamples(kind, length, random = Math.random) {
  const samples = new Float32Array(length);
  let low = 0;
  let fast = 0;
  let slow = 0;
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1;
    low = (low + white * 0.02) / 1.02;
    fast = fast * 0.85 + white * 0.15;
    slow = slow * 0.99 + white * 0.01;
    // Pink is a perceptual approximation, not a calibrated 1/f source.
    samples[i] = kind === 'brown' ? low * 3.5 : kind === 'pink' ? (fast + slow * 2) * 0.9 : white * 0.4;
  }
  // Smooth the periodic seam rather than abruptly joining unrelated endpoints.
  const fade = Math.min(2048, Math.floor(length / 4));
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    samples[i] = samples[length - 1] * (1 - t) + samples[i] * t;
  }
  return samples;
}

export class AudioEngine {
  constructor() { this.context = null; this.layers = new Map(); }
  initialize() {
    if (this.context) return;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('This browser does not support Web Audio.');
    this.context = new Context();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    const compressor = this.context.createDynamicsCompressor();
    this.master.connect(compressor).connect(this.context.destination);
  }
  createLayer(id) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 12, ctx.sampleRate);
    buffer.copyToChannel(noiseSamples(id, buffer.length), 0);
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let tail = source;
    if (['rain', 'ocean', 'wind'].includes(id)) {
      const filter = ctx.createBiquadFilter();
      filter.type = id === 'rain' ? 'highpass' : 'lowpass';
      filter.frequency.value = { rain: 650, ocean: 700, wind: 350 }[id];
      tail.connect(filter); tail = filter;
    }
    const nodes = [source, gain];
    if (id === 'ocean' || id === 'wind') {
      const swell = ctx.createGain();
      swell.gain.value = 0.6;
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = id === 'ocean' ? 0.09 : 0.045;
      depth.gain.value = 0.3;
      lfo.connect(depth).connect(swell.gain);
      tail.connect(swell); tail = swell;
      lfo.start(); nodes.push(lfo, depth, swell);
    }
    tail.connect(gain).connect(this.master);
    source.start();
    this.layers.set(id, { gain, nodes });
  }
  update(mix) {
    if (!this.context) return;
    for (const id of mix.enabled) if (!this.layers.has(id)) this.createLayer(id);
    for (const [id, layer] of this.layers) {
      // Fixed headroom keeps adding a layer from changing existing layer levels.
      const level = mix.enabled.includes(id) ? mix.levels[id] / 100 / 3 : 0;
      layer.gain.gain.setTargetAtTime(level, this.context.currentTime, 0.06);
    }
    const parameter = this.master.gain;
    parameter.cancelScheduledValues(this.context.currentTime);
    parameter.setTargetAtTime(mix.master / 100, this.context.currentTime, 0.06);
  }
  async play(mix) {
    this.initialize();
    await this.context.resume();
    if (this.context.state !== 'running') throw new Error('Audio is paused by your browser. Try Play again.');
    this.update(mix);
  }
  async pause() { if (this.context) await this.context.suspend(); }
  scheduleSleep(seconds, master) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const parameter = this.master.gain;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(master / 100, now);
    if (seconds > 0) {
      parameter.setValueAtTime(master / 100, now + Math.max(0, seconds - 5));
      parameter.linearRampToValueAtTime(0, now + seconds);
    }
  }
}
