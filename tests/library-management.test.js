import test from 'node:test';
import assert from 'node:assert/strict';
import { soundUsage, usageSignature, withoutSound, formatBytes, inspectStorage } from '../js/library-management.js';
import { classifyFiles } from '../js/file-import.js';
const fixture = () => ({ schemaVersion: 2, mix: { enabled: ['custom-a', 'brown'], levels: { 'custom-a': 20, brown: 40 }, master: 30, timerMinutes: 15 },
  saved: [{ name: 'Used', mix: { enabled: ['custom-a'], levels: { 'custom-a': 42 }, master: 60 } }, { name: 'Unused', mix: { enabled: ['rain'], levels: { rain: 10, 'custom-a': 50 } } }] });
test('reference previews count selected layers, including repeated names, but not inactive levels', () => {
  const state = fixture(); state.saved.push({ ...state.saved[0] });
  assert.deepEqual(soundUsage(state, 'custom-a'), { current: true, saved: ['Used', 'Used'] });
  const before = usageSignature(state, 'custom-a'); state.saved[2].name = 'Changed';
  assert.notEqual(usageSignature(state, 'custom-a'), before);
  assert.deepEqual(soundUsage(state, 'absent'), { current: false, saved: [] });
});
test('removal plans preserve mix names, levels, timer, and unrelated layers without mutating input', () => {
  const state = fixture(), original = structuredClone(state), next = withoutSound(state, 'custom-a');
  assert.deepEqual(state, original); assert.deepEqual(next.mix.enabled, ['brown']);
  assert.equal(next.mix.master, 30); assert.equal(next.mix.timerMinutes, 15); assert.deepEqual(next.mix.levels, { brown: 40 });
  assert.equal(next.saved[0].name, 'Used'); assert.deepEqual(next.saved[0].mix.enabled, []);
  assert.deepEqual(next.saved[1].mix.enabled, ['rain']); assert.deepEqual(next.saved[1].mix.levels, { rain: 10 });
});
test('storage estimates degrade safely for unavailable, throwing, and partially supported APIs', async () => {
  assert.deepEqual(await inspectStorage(undefined), { usage: undefined, quota: undefined, persistent: undefined });
  assert.deepEqual(await inspectStorage({ estimate() { throw new Error(); }, persisted: async () => true }), { usage: undefined, quota: undefined, persistent: true });
  assert.deepEqual(await inspectStorage({ estimate: async () => ({ usage: -1, quota: NaN }), persisted: async () => 'yes' }), { usage: undefined, quota: undefined, persistent: undefined });
  assert.deepEqual(await inspectStorage({ estimate: async () => ({ usage: 123, quota: 5000 }), persisted: async () => false }), { usage: 123, quota: 5000, persistent: false });
  assert.equal(formatBytes(0), '0 B'); assert.equal(formatBytes(1024), '1.0 KiB'); assert.equal(formatBytes(1048576), '1.0 MiB');
  assert.equal(formatBytes(NaN), 'Unavailable');
});
test('picker and dropped files classify by ZIP signature as well as names, and reject mixed batches', async () => {
  const audio = new File(['audio'], 'rain.wav', { type: 'audio/wav' });
  const zip = new File([new Uint8Array([80, 75, 3, 4])], 'backup', { type: 'application/octet-stream' });
  assert.equal((await classifyFiles([zip])).kind, 'zip');
  assert.deepEqual((await classifyFiles([audio])).files, [audio]);
  assert.equal((await classifyFiles([new File(['bad'], 'BROKEN.ZIP')])).kind, 'zip');
  await assert.rejects(classifyFiles([]), /Folders/);
  await assert.rejects(classifyFiles([audio, zip]), /on its own/);
  await assert.rejects(classifyFiles([zip, zip]), /on its own/);
  await assert.rejects(classifyFiles(Array(31).fill(audio)), /at most 30/);
});
