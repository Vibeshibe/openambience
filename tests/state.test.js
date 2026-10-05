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
  const mix = normalizeMix({ enabled: ['birds', 'binaural'], binauralBeat: 10, levels: { birds: 37, binaural: 23 } });
  const storage = { getItem: () => JSON.stringify({ mix, saved: [{ name: 'Headphones', mix }] }) };
  const restored = readStore(storage);
  assert.equal(restored.mix.binauralBeat, 10);
  assert.equal(restored.saved[0].mix.binauralBeat, 10);
  assert.equal(restored.mix.levels.birds, 37);
  assert.deepEqual(restored.mix.enabled, ['birds', 'binaural-10']);
  assert.equal(restored.mix.levels['binaural-10'], 23);
  assert.equal(restored.saved[0].mix.levels['binaural-10'], 23);
  for (const value of [undefined, null, '10', -1, 100, NaN, Infinity]) {
    assert.equal(normalizeMix({ binauralBeat: value }).binauralBeat, 6);
  }
});

test('older beat differences remain exact and preset tones retain independent levels', () => {
  for (const beat of [4, 8, 14, 20, 30]) {
    const mix = normalizeMix({ enabled: ['binaural'], binauralBeat: beat, levels: { binaural: 37 } });
    assert.deepEqual(mix.enabled, ['binaural']);
    assert.equal(mix.binauralBeat, beat);
    assert.equal(normalizeMix(mix).levels.binaural, 37);
  }
  const mix = normalizeMix({ enabled: ['binaural-2', 'binaural-10'], levels: { 'binaural-2': 21, 'binaural-10': 43 } });
  assert.deepEqual(normalizeMix(mix), mix);
  assert.equal(mix.levels['binaural-2'], 21);
  assert.equal(mix.levels['binaural-10'], 43);
  const older = { ...mix, enabled: ['binaural'], binauralBeat: 2, levels: { ...mix.levels, binaural: 17 } };
  assert.equal(normalizeMix(older).levels['binaural-2'], 17);
});
