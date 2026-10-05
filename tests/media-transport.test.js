import test from 'node:test';
import assert from 'node:assert/strict';
import { transportWave, MediaTransport } from '../js/media-transport.js';

test('media focus transport has a ten-second non-silent PCM track for Firefox', async () => {
  const blob = transportWave();
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
  assert.ok(bytes.slice(44).some(sample => sample !== 128));
  assert.ok(bytes.slice(44).every(sample => sample >= 96 && sample <= 160));
});

test('the control track can only reach the mix through a zero-gain node', t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  t.after(() => { if (original) Object.defineProperty(globalThis, 'Audio', original); else delete globalThis.Audio; });
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: class {
    setAttribute() {}
    addEventListener() {}
  } });
  const destination = {};
  const connections = [];
  const silencer = { gain: { value: 1 }, connect(target) {
    assert.equal(this.gain.value, 0, 'silenced before connecting to output');
    connections.push([this, target]); return target;
  } };
  const source = { connect(target) { connections.push([this, target]); return target; } };
  const context = { createMediaElementSource: () => source, createGain: () => silencer };
  const transport = new MediaTransport(context, destination);
  assert.deepEqual(connections, [[source, silencer], [silencer, destination]]);
  assert.equal(transport.media.muted, undefined, 'element is never muted');
});
