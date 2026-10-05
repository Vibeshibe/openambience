// Browsers do not consistently expose Web Audio alone to system media controls.
// A silent, unmuted media element supplies persistent audio focus; the mix still
// flows through the existing Web Audio graph. No network request is needed.
export function silentWave() {
  const samples = 80000; // Ten seconds: Chrome requires media longer than five.
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i);
  };
  text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVEfmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true); view.setUint16(34, 8, true);
  text(36, 'data'); view.setUint32(40, samples, true);
  bytes.fill(128, 44); // Unsigned 8-bit PCM silence, exactly zero after decoding.
  return new Blob([bytes], { type: 'audio/wav' });
}

export class MediaTransport {
  constructor(context, destination, onInterrupted) {
    this.media = new Audio();
    this.media.loop = true;
    this.media.preload = 'auto';
    this.media.setAttribute('playsinline', '');
    this.source = context.createMediaElementSource(this.media);
    this.source.connect(destination);
    this.active = false;
    this.url = null;
    this.media.addEventListener('pause', () => {
      if (this.active && this.media.paused) onInterrupted?.();
    });
    this.media.addEventListener('error', () => {
      if (this.active) onInterrupted?.();
    });
  }
  play() {
    if (!this.url) {
      this.url = URL.createObjectURL(silentWave());
      this.media.src = this.url;
    }
    this.active = true;
    // Called synchronously from the user's Play tap, before fetch/decode awaits.
    return this.media.play();
  }
  pause(release = false) {
    this.active = false;
    this.media.pause();
    if (release && this.url) {
      this.media.removeAttribute('src');
      this.media.load();
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
  }
}
