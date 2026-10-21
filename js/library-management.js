export function soundUsage(state, id) {
  return {
    current: Boolean(state.mix?.enabled?.includes(id)),
    saved: (state.saved || []).filter(item => item.mix?.enabled?.includes(id)).map(item => item.name),
  };
}
export const usageSignature = (state, id) => JSON.stringify(soundUsage(state, id));
export function withoutSound(state, id) {
  const clean = mix => ({ ...mix, enabled: mix.enabled.filter(value => value !== id),
    levels: Object.fromEntries(Object.entries(mix.levels).filter(([key]) => key !== id)) });
  return { ...state, mix: clean(state.mix), saved: state.saved.map(item => ({ ...item, mix: clean(item.mix) })) };
}
export function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return 'Unavailable';
  if (value < 1024) return `${Math.round(value)} B`;
  const unit = Math.min(3, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / 1024 ** unit).toFixed(1)} ${['B', 'KiB', 'MiB', 'GiB'][unit]}`;
}
export async function inspectStorage(manager) {
  const [estimate, persisted] = await Promise.allSettled([
    Promise.resolve().then(() => manager?.estimate?.()),
    Promise.resolve().then(() => manager?.persisted?.()),
  ]);
  const data = estimate.status === 'fulfilled' ? estimate.value : undefined;
  return { usage: Number.isFinite(data?.usage) && data.usage >= 0 ? data.usage : undefined,
    quota: Number.isFinite(data?.quota) && data.quota > 0 ? data.quota : undefined,
    persistent: persisted.status === 'fulfilled' && typeof persisted.value === 'boolean' ? persisted.value : undefined };
}
