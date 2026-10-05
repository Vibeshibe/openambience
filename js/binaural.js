// Original stereo tone generation. Three preset differences, with support for older saved settings.
export const BINAURAL_BEATS = [2, 4, 6, 8, 10, 14, 20, 30];
export const BINAURAL_PRESETS = [2, 6, 10].map(beat => ({
  id: `binaural-${beat}`, name: `Binaural ${beat} Hz`, kind: 'binaural', icon: '∿', beat,
}));
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
