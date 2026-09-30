export const CATEGORIES = ['All sounds', 'Weather', 'Water', 'Wildlife', 'Indoors', 'Noise & textures', 'My sounds', 'Radio', 'In your mix'];
export const CUSTOM_CATEGORIES = ['My sounds', 'Weather', 'Water', 'Wildlife', 'Indoors', 'Noise & textures'];
const groups = {
  Weather: ['rain-leaves', 'rain-glass', 'thunder', 'forest-wind'],
  Water: ['ocean-waves', 'stream'],
  Wildlife: ['birds', 'crickets', 'purr'],
  Indoors: ['fire', 'cafe', 'fan'],
};
export function categoryOf(sound) {
  if (sound.kind === 'radio') return 'Radio';
  if (sound.kind === 'custom') return CUSTOM_CATEGORIES.includes(sound.category) ? sound.category : 'My sounds';
  return Object.keys(groups).find(category => groups[category].includes(sound.id)) || 'Noise & textures';
}
export function matchesCategory(sound, category, enabled = []) {
  if (category === 'All sounds') return true;
  if (category === 'In your mix') return enabled.includes(sound.id);
  if (category === 'My sounds') return sound.kind === 'custom';
  return categoryOf(sound) === category;
}

export const FILTER_CATEGORIES = CATEGORIES.filter(name => name !== 'All sounds');
export function normalizeCategories(value) {
  return Array.isArray(value) ? FILTER_CATEGORIES.filter(name => value.includes(name)) : [];
}
export function readCategoryFilters(storage) {
  try {
    const current = storage?.getItem('openambience.categories');
    return current != null ? normalizeCategories(JSON.parse(current)) : normalizeCategories([storage?.getItem('openambience.category')]);
  } catch { return []; }
}
export function matchesCategories(sound, selected = [], enabled = []) {
  return selected.length === 0 || selected.some(name => matchesCategory(sound, name, enabled));
}
