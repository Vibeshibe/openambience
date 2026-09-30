import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RECORDINGS } from '../js/catalog.js';
import { SOUNDS, normalizeMix, readStore } from '../js/state.js';

test('bundled catalog matches attribution and every recording checksum', async () => {
  const credits = JSON.parse(await readFile(new URL('../audio/credits.json', import.meta.url)));
  assert.deepEqual(RECORDINGS, credits.sounds);
  assert.equal(new Set(SOUNDS.map(sound => sound.id)).size, SOUNDS.length);
  for (const sound of RECORDINGS) {
    assert.ok(['CC0-1.0', 'CC-BY-4.0'].includes(sound.license));
    assert.ok(sound.creator && sound.sourceUrl && sound.sourceTitle && sound.modifications);
    const bytes = await readFile(new URL(`../${sound.url}`, import.meta.url));
    assert.equal(bytes.length, sound.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), sound.sha256);
  }
});
test('custom sound IDs survive save/load while unknown IDs and excess layers are removed', () => {
  const catalog = [...SOUNDS, { id: 'custom-test' }];
  const raw = { mix: { enabled: ['custom-test', 'rain', 'unknown'], levels: { 'custom-test': 73 } }, saved: [{ name: 'Imported', mix: { enabled: ['custom-test'] } }] };
  const storage = { getItem: key => key === 'openambience.v2' ? JSON.stringify(raw) : null };
  const result = readStore(storage, catalog);
  assert.deepEqual(result.mix.enabled, ['rain', 'custom-test']);
  assert.equal(result.mix.levels['custom-test'], 73);
  assert.deepEqual(result.saved[0].mix.enabled, ['custom-test']);
  assert.equal(normalizeMix({ enabled: SOUNDS.map(sound => sound.id) }).enabled.length, 6);
});
test('legacy saved mixes retain procedural IDs and volume settings', () => {
  const raw = { mix: { enabled: ['ocean'], levels: { ocean: 61 } }, saved: [{ name: 'Old rain', mix: { enabled: ['rain'], levels: { rain: 29 } } }] };
  const storage = { getItem: key => key === 'openambience.v1' ? JSON.stringify(raw) : null };
  const result = readStore(storage);
  assert.deepEqual(result.mix.enabled, ['ocean']);
  assert.equal(result.mix.levels.ocean, 61);
  assert.equal(result.saved[0].mix.levels.rain, 29);
});
