import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, categoryOf, matchesCategory } from '../js/categories.js';
import { normalizeRadioUrl } from '../js/radio.js';
import { SOUNDS, normalizeMix } from '../js/state.js';

test('all bundled sounds have one browsable category without changing stable IDs', () => {
  for (const sound of SOUNDS) assert.ok(CATEGORIES.includes(categoryOf(sound)));
  assert.equal(categoryOf(SOUNDS.find(sound => sound.id === 'rain-leaves')), 'Weather');
  assert.equal(categoryOf(SOUNDS.find(sound => sound.id === 'rain')), 'Noise & textures');
  assert.equal(categoryOf(SOUNDS.find(sound => sound.id === 'purr')), 'Wildlife');
});
test('imports stay discoverable in My sounds after assigning another category', () => {
  const sound = { id: 'custom-1', kind: 'custom', category: 'Water' };
  assert.equal(categoryOf(sound), 'Water');
  assert.ok(matchesCategory(sound, 'My sounds'));
  assert.ok(matchesCategory(sound, 'Water'));
  assert.ok(matchesCategory(sound, 'In your mix', ['custom-1']));
  assert.equal(matchesCategory(sound, 'Radio'), false);
  assert.equal(categoryOf({ ...sound, category: 'corrupt' }), 'My sounds');
});
test('radio URLs accept direct HTTPS endpoints and reject unsafe or unsupported inputs', () => {
  assert.equal(normalizeRadioUrl(' https://Radio.Example/live?channel=1#player '), 'https://radio.example/live?channel=1');
  for (const url of ['', '/relative', 'http://example.com/live', 'javascript:alert(1)', 'data:audio/mp3,abc', 'https://user:password@example.com/live', 'https://example.com/live.m3u8', 'https://example.com/list.PLS?x=1']) assert.throws(() => normalizeRadioUrl(url));
});
test('saved mixes preserve station IDs and normalize radio volume', () => {
  const radio = { id: 'radio-1', kind: 'radio', name: 'Station', url: 'https://example.com/live' };
  const mix = normalizeMix({ enabled: ['radio-1', 'brown'], levels: { 'radio-1': 120 } }, [...SOUNDS, radio]);
  assert.deepEqual(mix.enabled, ['brown', 'radio-1']);
  assert.equal(mix.levels['radio-1'], 100);
  assert.equal(categoryOf(radio), 'Radio');
});
