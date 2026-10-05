import test from 'node:test';
import assert from 'node:assert/strict';
import { silentWave } from '../js/media-transport.js';

test('media focus transport contains ten seconds of exact PCM silence', async () => {
  const blob = silentWave();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const text = (start, end) => new TextDecoder().decode(bytes.slice(start, end));
  assert.equal(blob.type, 'audio/wav');
  assert.equal(text(0, 4), 'RIFF');
  assert.equal(text(8, 16), 'WAVEfmt ');
  assert.equal(text(36, 40), 'data');
  assert.equal(view.getUint32(4, true), bytes.length - 8);
  assert.equal(view.getUint16(20, true), 1); // PCM
  assert.equal(view.getUint16(22, true), 1); // mono
  assert.equal(view.getUint16(34, true), 8);
  assert.equal(view.getUint32(40, true), bytes.length - 44);
  assert.equal((bytes.length - 44) / view.getUint32(28, true), 10);
  assert.ok(bytes.slice(44).every(sample => sample === 128));
});
