import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMix, readStore, presetMix } from '../js/state.js';

test('untrusted mix values cannot add unknown layers or invalid volumes', () => {
  const mix = normalizeMix({ master: 300, enabled: ['rain', 'rain', 'missing'], levels: { rain: -10, brown: 'loud', white: NaN } });
  assert.equal(mix.master, 100);
  assert.deepEqual(mix.enabled, ['rain']);
  assert.equal(mix.levels.rain, 0);
  assert.equal(mix.levels.brown, 50);
  assert.equal(mix.levels.white, 50);
  assert.deepEqual(normalizeMix({ enabled: { includes: 1 } }).enabled, []);
});
test('missing, blocked, and corrupt storage recover to usable defaults', () => {
  for (const storage of [undefined, { getItem() { throw new Error('blocked'); } }, { getItem() { return '{bad json'; } }]) {
    assert.deepEqual(readStore(storage), { mix: normalizeMix(), saved: [] });
  }
});
test('saved mixes normalize data and do not alias the active mix', () => {
  const mix = presetMix({ rain: 30, brown: 60 });
  const savedMix = normalizeMix(mix);
  mix.levels.rain = 90;
  assert.equal(savedMix.levels.rain, 30);
  const storage = { getItem: () => JSON.stringify({ mix, saved: [null, { name: 1 }, { name: ' Evening ', mix: savedMix }] }) };
  const result = readStore(storage);
  assert.equal(result.saved.length, 1);
  assert.equal(result.saved[0].name, 'Evening');
  assert.equal(result.saved[0].mix.levels.rain, 30);
});
test('binaural settings survive saved mixes and older or invalid settings get a default', () => {
  const mix = normalizeMix({ enabled: ['birds', 'binaural'], binauralBeat: 10, levels: { birds: 37 } });
  const storage = { getItem: () => JSON.stringify({ mix, saved: [{ name: 'Headphones', mix }] }) };
  const restored = readStore(storage);
  assert.equal(restored.mix.binauralBeat, 10);
  assert.equal(restored.saved[0].mix.binauralBeat, 10);
  assert.equal(restored.mix.levels.birds, 37);
  assert.deepEqual(restored.mix.enabled, ['birds', 'binaural']);
  for (const value of [undefined, null, '10', -1, 100, NaN, Infinity]) {
    assert.equal(normalizeMix({ binauralBeat: value }).binauralBeat, 6);
  }
});
