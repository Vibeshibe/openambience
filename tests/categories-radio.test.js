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

test('multiple categories form a union, with no selections showing all sounds', async () => {
  const { matchesCategories, normalizeCategories } = await import('../js/categories.js');
  const selected = normalizeCategories(['Weather', 'Water', 'Weather', 'unknown', 'All sounds']);
  assert.deepEqual(selected, ['Weather', 'Water']);
  assert.equal(SOUNDS.filter(sound => matchesCategories(sound, selected)).length, 6);
  assert.equal(SOUNDS.filter(sound => matchesCategories(sound, [])).length, SOUNDS.length);
  const imported = { id: 'custom-water', kind: 'custom', category: 'Water' };
  assert.equal([imported].filter(sound => matchesCategories(sound, ['Water', 'My sounds'])).length, 1);
  assert.ok(matchesCategories({ id: 'radio-1', kind: 'radio' }, ['Water', 'Radio']));
  assert.ok(matchesCategories({ id: 'brown' }, ['Weather', 'In your mix'], ['brown']));
});
test('filter selections migrate from the old single choice and tolerate invalid storage', async () => {
  const { readCategoryFilters } = await import('../js/categories.js');
  const storage = entries => ({ getItem: key => entries[key] ?? null });
  assert.deepEqual(readCategoryFilters(storage({ 'openambience.category': 'Water' })), ['Water']);
  assert.deepEqual(readCategoryFilters(storage({ 'openambience.category': 'All sounds' })), []);
  assert.deepEqual(readCategoryFilters(storage({ 'openambience.category': 'Water', 'openambience.categories': '[]' })), []);
  assert.deepEqual(readCategoryFilters(storage({ 'openambience.categories': '["Water","Radio","Water","bad"]' })), ['Water', 'Radio']);
  for (const source of [undefined, storage({ 'openambience.categories': '{bad' }), storage({ 'openambience.categories': 'null' }), { getItem() { throw new Error('blocked'); } }]) assert.deepEqual(readCategoryFilters(source), []);
});
