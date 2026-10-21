import { SOUNDS, normalizeMix } from './state.js';
import { CUSTOM_CATEGORIES } from './categories.js';
import { normalizeRadioUrl } from './radio.js';
import { createZip, readZip, ZIP_LIMITS } from './zip.js';

const FORMAT = 'openambience-mix';
const MAX_LINK = 16000;
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const percent = value => Number.isFinite(value) && value >= 0 && value <= 100;
const idValid = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9-]{0,99}$/.test(value);
const metadataKeys = ['creator', 'sourceUrl', 'sourceTitle', 'license', 'licenseUrl', 'attributionText', 'modifications'];
export async function sha256(blob) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateRecipe(raw, { link = false } = {}) {
  if (!raw || raw.format !== FORMAT) throw new Error('This is not an OpenAmbience mix.');
  if (raw.schemaVersion !== 1) throw new Error('Unsupported mix version. Update OpenAmbience and try again.');
  if (!text(raw.name, 40)) throw new Error('The mix needs a name of at most 40 characters.');
  const mix = raw.mix;
  if (!mix || !Array.isArray(mix.enabled) || !mix.enabled.length || mix.enabled.length > 6
    || new Set(mix.enabled).size !== mix.enabled.length || !mix.enabled.every(idValid)
    || !percent(mix.master) || ![0, 15, 30, 60].includes(mix.timerMinutes)
    || ![2, 4, 6, 8, 10, 14, 20, 30].includes(mix.binauralBeat)
    || !mix.levels || !mix.enabled.every(id => Object.hasOwn(mix.levels, id) && percent(mix.levels[id]))) throw new Error('The mix contains invalid layers, levels, or timer settings.');
  if (!Array.isArray(raw.sounds) || raw.sounds.length > 6) throw new Error('Invalid mix sound list.');
  const ids = new Set(), paths = new Set();
  const sounds = raw.sounds.map(sound => {
    if (!sound || !idValid(sound.id) || ids.has(sound.id) || SOUNDS.some(item => item.id === sound.id)
      || !mix.enabled.includes(sound.id) || !text(sound.name, 60)) throw new Error('Invalid or duplicate sound in this mix.');
    ids.add(sound.id);
    if (sound.kind === 'radio') {
      if (!text(sound.url, 2048)) throw new Error('Invalid station URL.');
      return { id: sound.id, kind: 'radio', name: sound.name, category: 'Radio', url: normalizeRadioUrl(sound.url) };
    }
    if (sound.kind !== 'custom') throw new Error('Unsupported sound type in this mix.');
    if (link) throw new Error('This link needs local recordings. Ask for a mix ZIP containing the audio.');
    if (!/^[a-f0-9]{64}$/.test(sound.hash) || sound.path !== `audio/${sound.hash}.audio`
      || !CUSTOM_CATEGORIES.includes(sound.category) || !text(sound.mimeType, 100)
      || !Number.isFinite(sound.durationSeconds) || sound.durationSeconds <= 0 || sound.durationSeconds > 120
      || !Number.isInteger(sound.size) || sound.size <= 0 || sound.size > ZIP_LIMITS.fileBytes) throw new Error('Invalid recording metadata in this mix.');
    if (paths.has(sound.path)) throw new Error('Duplicate recording in this mix.');
    paths.add(sound.path);
    const metadata = {};
    for (const key of metadataKeys) {
      if (sound[key] === undefined) continue;
      if (!text(sound[key], 4000)) throw new Error('Invalid recording credits.');
      metadata[key] = sound[key];
    }
    return { id: sound.id, name: sound.name, kind: 'custom', category: sound.category, hash: sound.hash,
      path: sound.path, size: sound.size, mimeType: sound.mimeType, durationSeconds: sound.durationSeconds, ...metadata };
  });
  for (const id of mix.enabled) {
    if (!SOUNDS.some(sound => sound.id === id) && !ids.has(id)) throw new Error(`Missing or unsupported sound: ${id}. Update the app or request a complete ZIP.`);
  }
  return { format: FORMAT, schemaVersion: 1, name: raw.name.trim(), mix: {
    master: mix.master, timerMinutes: mix.timerMinutes, binauralBeat: mix.binauralBeat,
    enabled: [...mix.enabled], levels: Object.fromEntries(mix.enabled.map(id => [id, mix.levels[id]])),
  }, sounds };
}

export function makeRecipe(name, rawMix, catalog) {
  // Check before normalization, which intentionally removes missing local IDs.
  if (rawMix.enabled.some(id => !catalog.some(sound => sound.id === id))) throw new Error('A recording is missing. Restore it before exporting this mix.');
  const mix = normalizeMix(rawMix, catalog);
  const sounds = mix.enabled.flatMap(id => {
    const sound = catalog.find(item => item.id === id);
    if (sound.kind === 'radio') return [{ id, name: sound.name, kind: 'radio', url: sound.url }];
    if (sound.kind !== 'custom') return [];
    if (!(sound.blob instanceof Blob) || !sound.blob.size) throw new Error(`“${sound.name}” is missing its audio. Restore it before downloading.`);
    return [{ ...Object.fromEntries(metadataKeys.filter(key => sound[key] !== undefined).map(key => [key, sound[key]])),
      id, name: sound.name, kind: 'custom', category: sound.category || 'My sounds', hash: sound.hash,
      path: `audio/${sound.hash}.audio`, size: sound.blob.size, mimeType: sound.blob.type || 'application/octet-stream', durationSeconds: sound.durationSeconds }];
  });
  return validateRecipe({ format: FORMAT, schemaVersion: 1, name, mix, sounds });
}

export function mixLink(recipe, baseUrl) {
  if (recipe.sounds.some(sound => sound.kind === 'custom')) throw new Error('This mix uses your recordings. Download its ZIP to include the audio.');
  const safe = validateRecipe(recipe, { link: true });
  const encoded = btoa(Array.from(new TextEncoder().encode(JSON.stringify(safe)), byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  const url = new URL(baseUrl); url.search = ''; url.hash = `mix=v1.${encoded}`;
  if (url.href.length > MAX_LINK) throw new Error('This mix link is too long. Download its ZIP instead.');
  return url.href;
}

export function recipeFromHash(hash) {
  if (!hash.startsWith('#mix=')) return null;
  if (hash.length > MAX_LINK) throw new Error('This mix link is too long. Ask for a mix ZIP.');
  if (!hash.startsWith('#mix=v1.')) throw new Error('Unsupported mix link version. Update OpenAmbience and try again.');
  let raw;
  try {
    const encoded = hash.slice(8);
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error();
    const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
    raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch { throw new Error('This mix link is damaged or incomplete.'); }
  return validateRecipe(raw, { link: true });
}

export async function exportMixZip(recipe, catalog) {
  const safe = validateRecipe(recipe);
  const entries = [{ name: 'mix.json', blob: new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' }) }];
  for (const sound of safe.sounds.filter(item => item.kind === 'custom')) {
    const blob = catalog.find(item => item.id === sound.id)?.blob;
    if (!blob || blob.size !== sound.size || await sha256(blob) !== sound.hash) throw new Error(`“${sound.name}” is missing or damaged. No ZIP was downloaded.`);
    entries.push({ name: sound.path, blob });
  }
  return createZip(entries);
}

export async function importMixZip(file) {
  const files = await readZip(file);
  const json = files.get('mix.json');
  if (!json) throw new Error('This ZIP has no mix.json. Choose an OpenAmbience mix download.');
  let raw;
  try { raw = JSON.parse(await json.text()); } catch { throw new Error('The ZIP contains damaged mix settings.'); }
  const recipe = validateRecipe(raw);
  const expected = new Set(['mix.json', ...recipe.sounds.filter(sound => sound.kind === 'custom').map(sound => sound.path)]);
  if (files.size !== expected.size || [...files.keys()].some(path => !expected.has(path))) throw new Error('The ZIP contains missing or unexpected files.');
  for (const sound of recipe.sounds.filter(item => item.kind === 'custom')) {
    const blob = files.get(sound.path);
    if (!blob || blob.size !== sound.size || await sha256(blob) !== sound.hash) throw new Error(`Missing or damaged recording: ${sound.name}.`);
  }
  return { recipe, files };
}

// Preparation has no storage side effects. The caller validates audio, then uses
// one IndexedDB transaction to commit additions and the complete state snapshot.
export async function prepareRestore(recipe, files, catalog, inspectAudio) {
  recipe = validateRecipe(recipe);
  const additions = [], mapping = new Map();
  for (const sound of recipe.sounds) {
    const existing = [...catalog, ...additions].find(item => sound.kind === 'radio' ? item.kind === 'radio' && item.url === sound.url : item.kind === 'custom' && item.hash === sound.hash);
    if (sound.kind === 'custom') {
      const source = files?.get(sound.path);
      if (!source || source.size !== sound.size || await sha256(source) !== sound.hash) throw new Error(`Missing or damaged recording: ${sound.name}.`);
      // Even matching hashes are decoded before committing an untrusted archive.
      const blob = source.slice(0, source.size, sound.mimeType);
      const durationSeconds = await inspectAudio(blob);
      if (!existing) {
        const { path, size, mimeType, ...metadata } = sound;
        additions.push({ ...metadata, id: `custom-${crypto.randomUUID()}`, blob, durationSeconds });
      }
    } else if (!existing) additions.push({ ...sound, id: `radio-${crypto.randomUUID()}` });
    mapping.set(sound.id, existing?.id || additions.at(-1).id);
  }
  for (const [kind, limit] of [['custom', 30], ['radio', 20]]) {
    if ([...catalog, ...additions].filter(sound => sound.kind === kind).length > limit) throw new Error(`This import would exceed ${limit} ${kind === 'custom' ? 'recordings' : 'stations'}. Remove unused sounds first.`);
  }
  const enabled = recipe.mix.enabled.map(id => mapping.get(id) || id);
  const levels = Object.fromEntries(recipe.mix.enabled.map(id => [mapping.get(id) || id, recipe.mix.levels[id]]));
  if (new Set(enabled).size !== enabled.length) throw new Error('This mix refers to the same local sound more than once.');
  return { additions, mix: normalizeMix({ ...recipe.mix, enabled, levels }, [...catalog, ...additions]) };
}
