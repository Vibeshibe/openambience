import { RECORDINGS } from './catalog.js';
import { BINAURAL_PRESETS, normalizeBinauralBeat } from './binaural.js';
export const SOUNDS = [...RECORDINGS,
  { id: 'rain', name: 'Rain texture', icon: '☂', description: 'A gentle wash against the window.' },
  { id: 'ocean', name: 'Ocean texture', icon: '≈', description: 'Slow swells, a little further away.' },
  { id: 'wind', name: 'Wind texture', icon: '≋', description: 'An easy breeze through the trees.' },
  { id: 'white', name: 'White noise', icon: '⋮', description: 'A bright, even blanket of sound.' },
  { id: 'pink', name: 'Pink noise', icon: '∿', description: 'A softer texture for settling in.' },
  { id: 'brown', name: 'Brown noise', icon: '⌁', description: 'Low and warm, with room to think.' },
  ...BINAURAL_PRESETS,
  // Only shown while an older mix uses a beat outside the three presets.
  { id: 'binaural', name: 'Saved binaural beats', kind: 'binaural', icon: '∿', legacy: true },
];
export const PRESETS = [
  { name: 'Deep focus', note: 'Less distraction, more flow', levels: { brown: 65, 'rain-leaves': 35 } },
  { name: 'Coastal pause', note: 'Somewhere by the water', levels: { 'ocean-waves': 65, 'forest-wind': 25 } },
  { name: 'Slow evening', note: 'Let the day settle', levels: { fire: 55, crickets: 25 } },
];
const percent = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
export function normalizeMix(raw = {}, catalog = SOUNDS) {
  if (!raw || typeof raw !== 'object') raw = {};
  const binauralBeat = normalizeBinauralBeat(raw.binauralBeat);
  const replacement = BINAURAL_PRESETS.find(sound => sound.beat === binauralBeat && catalog.some(item => item.id === sound.id))?.id;
  const migrateLevel = replacement && Array.isArray(raw.enabled) && raw.enabled.includes('binaural') && !raw.enabled.includes(replacement);
  const enabled = Array.isArray(raw.enabled) ? raw.enabled.map(id => id === 'binaural' && replacement ? replacement : id) : [];
  return {
    master: percent(raw.master, 40),
    binauralBeat,
    levels: Object.fromEntries(catalog.map(({ id }) => [id, percent(migrateLevel && id === replacement ? raw.levels?.binaural : raw.levels?.[id], 50)])),
    enabled: catalog.filter(({ id }) => enabled.includes(id)).map(({ id }) => id).slice(0, 6),
  };
}
export function presetMix(levels) {
  return normalizeMix({ levels, enabled: Object.keys(levels) });
}
export function readStore(storage, catalog = SOUNDS) {
  try {
    const raw = JSON.parse(storage.getItem('openambience.v2') || storage.getItem('openambience.v1'));
    return {
      mix: normalizeMix(raw?.mix, catalog),
      saved: (Array.isArray(raw?.saved) ? raw.saved : []).slice(0, 20)
        .filter(item => item && typeof item.name === 'string' && item.name.trim())
        .map(item => ({ name: item.name.trim().slice(0, 40), mix: normalizeMix(item.mix, catalog) })),
    };
  } catch { return { mix: normalizeMix(), saved: [] }; }
}
