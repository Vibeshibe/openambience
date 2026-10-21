import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { SOUNDS, normalizeMix, readStore } from '../js/state.js';
import { makeRecipe, mixLink, recipeFromHash, exportMixZip, importMixZip, prepareRestore, validateRecipe, sha256 } from '../js/portable-mix.js';
import { createZip, readZip, crc32, ZIP_LIMITS } from '../js/zip.js';

globalThis.crypto ||= webcrypto;
const base = () => makeRecipe('Morning ☀ 雨', normalizeMix({ enabled: ['rain', 'binaural-20'], levels: { rain: 23, 'binaural-20': 17 }, master: 62, timerMinutes: 30 }), SOUNDS);
async function customFixture() {
  const blob = new Blob(['example audio bytes'], { type: 'audio/wav' });
  const custom = { id: 'custom-export', name: 'My rain', kind: 'custom', category: 'Weather', hash: await sha256(blob), durationSeconds: 12, blob, creator: 'Me', attributionText: 'Private recording' };
  const radio = { id: 'radio-export', name: 'My station', kind: 'radio', url: 'https://example.com/live.mp3' };
  const catalog = [...SOUNDS, custom, radio];
  const mix = normalizeMix({ enabled: ['brown', custom.id, radio.id, 'binaural-20'], master: 31, timerMinutes: 60, levels: { brown: 12, [custom.id]: 24, [radio.id]: 35, 'binaural-20': 16 } }, catalog);
  return { custom, radio, catalog, mix, recipe: makeRecipe('Portable rain', mix, catalog) };
}

test('versioned fragment URLs round-trip Unicode names, selected levels, timer and tones', () => {
  const recipe = base(), url = new URL(mixLink(recipe, 'https://example.com/openambience/?obsolete=1#old'));
  assert.equal(url.pathname, '/openambience/'); assert.equal(url.search, '');
  assert.match(url.hash, /^#mix=v1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(recipeFromHash(url.hash), recipe);
  assert.equal(recipeFromHash('#library'), null);
  assert.throws(() => recipeFromHash('#mix=v2.abc'), /version/);
  assert.throws(() => recipeFromHash('#mix=v1.%'), /damaged/);
  assert.throws(() => recipeFromHash(`#mix=v1.${'a'.repeat(16000)}`), /too long/);
});

test('strict portable validation reports missing layers rather than normalizing them away', () => {
  for (const mutate of [
    r => { r.schemaVersion = 2; }, r => { r.mix.enabled.push('unknown'); r.mix.levels.unknown = 50; },
    r => { r.mix.master = -1; }, r => { r.mix.timerMinutes = 12; }, r => { r.mix.levels.rain = '23'; },
    r => { r.mix.enabled.push('rain'); }, r => { r.mix.enabled = []; }, r => { r.sounds = {}; },
  ]) { const recipe = base(); mutate(recipe); assert.throws(() => validateRecipe(recipe)); }
  assert.throws(() => makeRecipe('Missing', { enabled: ['custom-gone'] }, SOUNDS), /missing/);
});

test('ZIP includes only referenced custom bytes, settings and available credits', async () => {
  const { recipe, catalog, custom } = await customFixture();
  assert.throws(() => mixLink(recipe, 'https://example.com/'), /ZIP/);
  const zip = await exportMixZip(recipe, catalog), { recipe: restored, files } = await importMixZip(zip);
  assert.deepEqual(restored, recipe);
  assert.deepEqual([...files.keys()], ['mix.json', `audio/${custom.hash}.audio`]);
  assert.equal(await files.get(`audio/${custom.hash}.audio`).text(), await custom.blob.text());
  assert.equal(restored.sounds.find(sound => sound.kind === 'custom').attributionText, 'Private recording');
  await assert.rejects(exportMixZip(recipe, SOUNDS), /missing/);
});

test('restoration remaps colliding IDs, reuses hashes and station URLs, and preserves local metadata', async () => {
  const { recipe, catalog, custom, radio } = await customFixture();
  const { files } = await importMixZip(await exportMixZip(recipe, catalog));
  const existing = { ...custom, id: 'custom-local', name: 'Keep my name', category: 'My sounds' };
  const local = [...SOUNDS, existing, { ...radio, id: 'radio-local' }, { ...custom, id: 'custom-export', hash: 'f'.repeat(64) }];
  const prepared = await prepareRestore(recipe, files, local, async () => 12);
  assert.equal(prepared.additions.length, 0);
  assert.equal(prepared.mix.levels['custom-local'], 24);
  assert.equal(prepared.mix.levels['radio-local'], 35);
  assert.equal(prepared.mix.levels['binaural-20'], 16);
  assert.equal(prepared.mix.timerMinutes, 60);
  assert.equal(existing.name, 'Keep my name'); assert.equal(existing.category, 'My sounds');
  const fresh = await prepareRestore(recipe, files, SOUNDS, async () => 12);
  assert.equal(fresh.additions.length, 2);
  assert.notEqual(fresh.additions[0].id, custom.id);
  assert.equal(fresh.mix.levels[fresh.additions[0].id], 24);
  const repeated = await prepareRestore(recipe, files, [...SOUNDS, ...fresh.additions], async () => 12);
  assert.equal(repeated.additions.length, 0);
  assert.deepEqual(repeated.mix, fresh.mix);
});

test('invalid audio, missing bytes, hash mismatch and library limits reject without additions', async () => {
  const { recipe, catalog, custom } = await customFixture();
  const { files } = await importMixZip(await exportMixZip(recipe, catalog));
  await assert.rejects(prepareRestore(recipe, files, SOUNDS, async () => { throw new Error('unsupported audio'); }), /unsupported audio/);
  await assert.rejects(prepareRestore(recipe, new Map(), SOUNDS, async () => 12), /Missing/);
  const damaged = new Map(files); damaged.set(custom.path || `audio/${custom.hash}.audio`, new Blob(['bad']));
  await assert.rejects(prepareRestore(recipe, damaged, SOUNDS, async () => 12), /damaged/);
  const full = [...SOUNDS, ...Array.from({ length: 30 }, (_, i) => ({ id: `custom-${i}`, kind: 'custom', hash: String(i) }))];
  await assert.rejects(prepareRestore(recipe, files, full, async () => 12), /exceed 30/);
  assert.equal(full.length, SOUNDS.length + 30);
});

test('incomplete archives, unexpected files and invalid station URLs are rejected', async () => {
  const { recipe } = await customFixture();
  await assert.rejects(importMixZip(await createZip([{ name: 'mix.json', blob: new Blob([JSON.stringify(recipe)]) }])), /missing|unexpected/);
  await assert.rejects(importMixZip(await createZip([{ name: 'wrong.json', blob: new Blob(['{}']) }])), /no mix.json/);
  const bad = structuredClone(recipe); bad.sounds.find(sound => sound.kind === 'radio').url = 'http://example.com/live.mp3';
  assert.throws(() => validateRecipe(bad), /HTTPS/);
  const extra = await createZip([{ name: 'mix.json', blob: new Blob([JSON.stringify(base())]) }, { name: 'extra.txt', blob: new Blob(['surprise']) }]);
  await assert.rejects(importMixZip(extra), /unexpected/);
});

test('ZIP rejects corrupt CRCs, unsafe paths, duplicate paths, truncation and declared expansion attacks', async () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const zip = await createZip([{ name: 'mix.json', blob: new Blob(['{}']) }]);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  for (const mutation of [
    data => { data[38] ^= 1; }, // stored payload, checked by CRC
    data => { const view = new DataView(data.buffer); view.setUint32(40 + 24, ZIP_LIMITS.jsonBytes + 1, true); },
    data => { data[30] = 47; data[40 + 46] = 47; }, // absolute path
    data => { data[40 + 8] |= 1; }, // encryption flag
  ]) { const data = bytes.slice(); mutation(data); await assert.rejects(readZip(new Blob([data]))); }
  for (const length of [1, 20, bytes.length - 1]) await assert.rejects(readZip(new Blob([bytes.slice(0, length)])));
  await assert.rejects(createZip([{ name: '../bad', blob: new Blob(['a']) }]), /path/);
  await assert.rejects(createZip([{ name: 'a', blob: new Blob(['a']) }, { name: 'a', blob: new Blob(['b']) }]), /duplicate/);
});

test('normal deflate ZIPs restore, while decompression beyond the declared size fails', async () => {
  const payload = new TextEncoder().encode('compressible '.repeat(100)), packed = deflateRawSync(payload);
  const original = new Uint8Array(await (await createZip([{ name: 'mix.json', blob: new Blob([payload]) }])).arrayBuffer());
  const localLength = 38, oldCentral = localLength + payload.length;
  const result = new Uint8Array(localLength + packed.length + original.length - oldCentral);
  result.set(original.subarray(0, localLength)); result.set(packed, localLength); result.set(original.subarray(oldCentral), localLength + packed.length);
  const view = new DataView(result.buffer), central = localLength + packed.length;
  view.setUint16(8, 8, true); view.setUint32(18, packed.length, true);
  view.setUint16(central + 10, 8, true); view.setUint32(central + 20, packed.length, true);
  view.setUint32(result.length - 6, central, true);
  // Node 22+ supports the browser's raw DEFLATE stream format.
  try { new DecompressionStream('deflate-raw'); } catch { return; }
  const restored = await readZip(new Blob([result])); assert.equal(await restored.get('mix.json').text(), new TextDecoder().decode(payload));
  view.setUint32(22, 2, true); view.setUint32(central + 24, 2, true);
  await assert.rejects(readZip(new Blob([result])), /exceeds/);
});

test('timer persistence migrates legacy data and never stores playback or deadlines', () => {
  assert.equal(normalizeMix().timerMinutes, 0);
  const state = readStore({ getItem: () => JSON.stringify({ mix: { timerMinutes: 15, enabled: ['rain'], playing: true, deadline: 123 }, saved: [{ name: 'Old', mix: { enabled: ['rain'] } }] }) });
  assert.equal(state.mix.timerMinutes, 15); assert.equal(state.saved[0].mix.timerMinutes, 0);
  assert.equal(state.mix.playing, undefined); assert.equal(state.mix.deadline, undefined);
});
