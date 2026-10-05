import test from 'node:test';
import assert from 'node:assert/strict';
import { MixMediaSession } from '../js/media-session.js';

class Metadata { constructor(data) { Object.assign(this, data); } }
test('registers transport actions independently and clears inapplicable actions', () => {
  const registered = new Map();
  let played = 0, paused = 0;
  const session = { setActionHandler(action, handler) {
    if (action === 'stop') throw new Error('Unsupported');
    registered.set(action, handler);
  } };
  new MixMediaSession({ stop() {}, play() { played++; }, pause() { paused++; } }, session, Metadata);
  registered.get('play')(); registered.get('pause')();
  assert.equal(played, 1); assert.equal(paused, 1);
  for (const action of ['previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto']) assert.equal(registered.get(action), null);
});
test('updates mix metadata and playback state, retains metadata on pause, and clears on stop', () => {
  const session = { setActionHandler() {} };
  const media = new MixMediaSession({}, session, Metadata);
  media.sync([], 'none');
  assert.equal(session.metadata, null);
  media.sync(['Rain', 'Brown noise'], 'playing');
  assert.equal(session.playbackState, 'playing');
  assert.equal(session.metadata.title, 'Rain · Brown noise');
  assert.equal(session.metadata.artist, 'OpenAmbience');
  assert.equal(session.metadata.artwork.length, 2);
  assert.match(session.metadata.artwork[0].src, /\/icons\/icon-192.png$/);
  const original = session.metadata;
  media.sync(['Rain', 'Brown noise'], 'paused');
  assert.equal(session.metadata, original);
  assert.equal(session.playbackState, 'paused');
  media.sync(['My station'], 'playing');
  assert.equal(session.metadata.title, 'My station');
  media.sync([], 'none');
  assert.equal(session.metadata, null);
  assert.equal(session.playbackState, 'none');
});
test('missing and partially implemented APIs do not break playback', () => {
  new MixMediaSession({}, null).sync(['Rain'], 'playing');
  const session = { setActionHandler() { throw new Error('Unsupported'); } };
  new MixMediaSession({ play() {} }, session, null).sync(['Rain'], 'playing');
  assert.equal(session.playbackState, 'playing');
  assert.equal(session.metadata, null);
  const broken = {
    set metadata(value) { throw new Error('Unavailable'); },
    set playbackState(value) { throw new Error('Unavailable'); },
  };
  assert.doesNotThrow(() => new MixMediaSession({}, broken, Metadata).sync(['Rain'], 'playing'));
});
