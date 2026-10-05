import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine, noiseSamples } from '../js/audio.js';

function seededRandom() {
  let seed = 12345;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}
const roughness = samples => samples.slice(1).reduce((sum, value, i) => sum + (value - samples[i]) ** 2, 0) / samples.length;
test('noise buffers are finite, non-silent, bounded, and join at the boundary', () => {
  for (const kind of ['white', 'pink', 'brown', 'rain', 'ocean', 'wind']) {
    const data = noiseSamples(kind, 48000, seededRandom());
    assert.equal(data.length, 48000);
    assert.ok(data.every(value => Number.isFinite(value) && Math.abs(value) <= 1));
    assert.ok(data.some(value => Math.abs(value) > 0.01));
    assert.equal(data[0], data.at(-1));
  }
});
test('brown texture has less high-frequency variation than white noise', () => {
  const brown = noiseSamples('brown', 48000, seededRandom());
  const white = noiseSamples('white', 48000, seededRandom());
  assert.ok(roughness(brown) < roughness(white) / 10);
});
test('pause during context resume cancels pending layer creation', async () => {
  const engine = new AudioEngine(() => {});
  let resumed, updates = 0;
  engine.context = {
    state: 'running',
    resume: () => new Promise(resolve => { resumed = resolve; }),
    suspend: async () => {},
  };
  engine.update = async () => { updates++; };
  const pending = engine.play({ enabled: ['brown'] });
  await engine.pause();
  resumed(); await pending;
  assert.equal(updates, 0);
});
