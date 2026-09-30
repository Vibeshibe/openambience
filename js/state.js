export const SOUNDS = [
  { id: 'rain', name: 'Soft rain', icon: '☂', description: 'A gentle wash against the window.' },
  { id: 'ocean', name: 'Ocean', icon: '≈', description: 'Slow swells, a little further away.' },
  { id: 'wind', name: 'Wind', icon: '≋', description: 'An easy breeze through the trees.' },
  { id: 'white', name: 'White noise', icon: '⋮', description: 'A bright, even blanket of sound.' },
  { id: 'pink', name: 'Pink noise', icon: '∿', description: 'A softer texture for settling in.' },
  { id: 'brown', name: 'Brown noise', icon: '⌁', description: 'Low and warm, with room to think.' },
];
export const PRESETS = [
  { name: 'Deep focus', note: 'Less distraction, more flow', levels: { brown: 65, rain: 25 } },
  { name: 'Coastal pause', note: 'Somewhere by the water', levels: { ocean: 65, wind: 20 } },
  { name: 'Slow evening', note: 'Let the day settle', levels: { pink: 35, rain: 45 } },
];
const percent = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
export function normalizeMix(raw = {}) {
  if (!raw || typeof raw !== 'object') raw = {};
  return {
    master: percent(raw.master, 40),
    levels: Object.fromEntries(SOUNDS.map(({ id }) => [id, percent(raw.levels?.[id], 50)])),
    enabled: SOUNDS.filter(({ id }) => Array.isArray(raw.enabled) && raw.enabled.includes(id)).map(({ id }) => id),
  };
}
export function presetMix(levels) {
  return normalizeMix({ levels, enabled: Object.keys(levels) });
}
export function readStore(storage) {
  try {
    const raw = JSON.parse(storage.getItem('openambience.v1'));
    return {
      mix: normalizeMix(raw?.mix),
      saved: (Array.isArray(raw?.saved) ? raw.saved : []).slice(0, 20)
        .filter(item => item && typeof item.name === 'string' && item.name.trim())
        .map(item => ({ name: item.name.trim().slice(0, 40), mix: normalizeMix(item.mix) })),
    };
  } catch { return { mix: normalizeMix(), saved: [] }; }
}
