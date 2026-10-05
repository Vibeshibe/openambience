import { RadioLayer } from './radio.js';
import { MediaTransport } from './media-transport.js';
import { createBinauralLayer } from './binaural.js';
// Original procedural textures alongside locally served or imported recordings.
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
  constructor(resolveSound, onSoundStatus, onPlaybackState) {
    this.resolveSound = resolveSound;
    this.onSoundStatus = onSoundStatus;
    this.onPlaybackState = onPlaybackState;
    this.context = null;
    this.layers = new Map();
    this.revision = 0;
  }
  initialize() {
    if (this.context) return;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('This browser does not support Web Audio.');
    // Safari otherwise treats Web Audio as ambient audio, subject to silent mode.
    try { if (globalThis.navigator?.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    this.context = new Context();
    this.context.addEventListener('statechange', () => this.onPlaybackState?.(this.context.state));
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    const compressor = this.context.createDynamicsCompressor();
    this.master.connect(compressor).connect(this.context.destination);
    this.transport = new MediaTransport(this.context, this.master, () => this.onPlaybackState?.('interrupted'));
  }
  remove(id) {
    const layer = this.layers.get(id);
    if (!layer) return;
    layer.radio?.destroy();
    for (const node of layer.nodes) { try { node.stop?.(); } catch {} node.disconnect(); }
    this.layers.delete(id);
  }
  async bufferFor(sound) {
    const ctx = this.context;
    if (sound.kind === 'recording' || sound.kind === 'custom') {
      const bytes = sound.blob ? await sound.blob.arrayBuffer() : await fetch(sound.url).then(response => {
        if (!response.ok) throw new Error(`${sound.name} could not be loaded.`);
        return response.arrayBuffer();
      });
      return ctx.decodeAudioData(bytes);
    }
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 12, ctx.sampleRate);
    buffer.copyToChannel(noiseSamples(sound.id, buffer.length), 0);
    return buffer;
  }
  async update(mix) {
    if (!this.context) return;
    const revision = ++this.revision;
    for (const id of this.layers.keys()) if (!mix.enabled.includes(id)) this.remove(id);
    for (const id of mix.enabled) {
      if (this.layers.has(id)) continue;
      const sound = this.resolveSound(id);
      if (!sound) throw new Error('A sound is missing from this device.');
      if (sound.kind === 'binaural') {
        this.layers.set(id, createBinauralLayer(this.context, this.master, sound.beat ?? mix.binauralBeat));
        continue;
      }
      if (sound.kind === 'radio') {
        const radio = new RadioLayer(this.context, sound, this.master, this.onSoundStatus);
        this.layers.set(id, { radio, gain: radio.gain, nodes: [], bytes: 0 });
        radio.start();
        continue;
      }
      let buffer = await this.bufferFor(sound);
      if (revision !== this.revision) return;
      const used = [...this.layers.values()].reduce((sum, layer) => sum + layer.bytes, 0);
      const bytes = (buffer.length + (sound.mode === 'event' ? buffer.sampleRate * 30 : 0)) * buffer.numberOfChannels * 4;
      if (used + bytes > 96 * 1024 * 1024) throw new Error('This mix is too large. Remove a long recording and try again.');
      // Thunder is an occasional event with silence between repeats.
      if (sound.mode === 'event') {
        const spaced = this.context.createBuffer(buffer.numberOfChannels, buffer.length + buffer.sampleRate * 30, buffer.sampleRate);
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) spaced.copyToChannel(buffer.getChannelData(channel), channel);
        buffer = spaced;
      }
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.context.createGain();
      gain.gain.value = 0;
      const nodes = [source, gain];
      let tail = source;
      if (['rain', 'ocean', 'wind'].includes(id)) {
        const filter = this.context.createBiquadFilter();
        filter.type = id === 'rain' ? 'highpass' : 'lowpass';
        filter.frequency.value = { rain: 650, ocean: 700, wind: 350 }[id];
        tail.connect(filter); tail = filter; nodes.push(filter);
      }
      if (id === 'ocean' || id === 'wind') {
        const swell = this.context.createGain(); swell.gain.value = 0.6;
        const lfo = this.context.createOscillator();
        const depth = this.context.createGain();
        lfo.frequency.value = id === 'ocean' ? 0.09 : 0.045; depth.gain.value = 0.3;
        lfo.connect(depth).connect(swell.gain); tail.connect(swell); tail = swell;
        lfo.start(); nodes.push(lfo, depth, swell);
      }
      tail.connect(gain).connect(this.master);
      source.start();
      this.layers.set(id, { gain, nodes, bytes: buffer.length * buffer.numberOfChannels * 4 });
    }
    if (revision !== this.revision) return;
    for (const [id, layer] of this.layers) {
      layer.setBeat?.(this.resolveSound(id)?.beat ?? mix.binauralBeat);
      layer.gain.gain.setTargetAtTime(mix.levels[id] / 100 / 3, this.context.currentTime, 0.06);
    }
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(mix.master / 100, this.context.currentTime, 0.06);
  }
  async play(mix) {
    this.initialize();
    const revision = ++this.revision;
    // Start both before yielding so iOS keeps the Play gesture for each API.
    await Promise.all([this.transport?.play(), this.context.resume()]);
    if (revision !== this.revision) return;
    if (this.context.state !== 'running') throw new Error('Audio is paused by your browser. Try Play again.');
    await this.update(mix);
  }
  async pause(release = false) {
    ++this.revision;
    this.transport?.pause(release);
    for (const [id, layer] of this.layers) if (layer.radio) this.remove(id);
    if (this.context) await this.context.suspend();
  }
  disconnectRadios() {
    for (const layer of this.layers.values()) layer.radio?.offline();
  }
  retryRadio(id) { this.layers.get(id)?.radio?.start(); }
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
