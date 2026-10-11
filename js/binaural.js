// Original stereo tone generation. Band labels describe frequency ranges only.
export const BINAURAL_PRESETS = [
  [2, 'Delta', 'Try for winding down before sleep.'],
  [4, 'Theta', 'Try for quiet meditation.'],
  [6, 'Theta', 'Try for a relaxing pause.'],
  [8, 'Alpha', 'Try for relaxed reading.'],
  [10, 'Alpha', 'Try for calm focus.'],
  [14, 'Beta', 'Try for steady study.'],
  [20, 'Beta', 'Try for focused work.'],
  [30, 'Beta', 'Try for an active work session.'],
].map(([beat, band, description]) => ({
  id: `binaural-${beat}`, name: `Binaural ${beat} Hz`, kind: 'binaural', icon: '∿', beat, band, description,
}));
export const BINAURAL_BEATS = BINAURAL_PRESETS.map(sound => sound.beat);
export const normalizeBinauralBeat = value => BINAURAL_BEATS.includes(value) ? value : 6;

export function createBinauralLayer(context, destination, beat) {
  const left = context.createOscillator(), right = context.createOscillator();
  left.type = right.type = 'sine';
  left.frequency.value = 200;
  right.frequency.value = 200 + normalizeBinauralBeat(beat);
  const stereo = context.createChannelMerger(2);
  left.connect(stereo, 0, 0); right.connect(stereo, 0, 1);
  // Match the quiet recorded layers instead of sending full-scale sine tones.
  const trim = context.createGain(); trim.gain.value = 0.1;
  const gain = context.createGain(); gain.gain.value = 0;
  stereo.connect(trim).connect(gain).connect(destination);
  const start = context.currentTime;
  left.start(start); right.start(start);
  return {
    gain, nodes: [left, right, stereo, trim, gain], bytes: 0,
    setBeat(value) { right.frequency.setTargetAtTime(200 + normalizeBinauralBeat(value), context.currentTime, 0.06); },
  };
}
