export function normalizeRadioUrl(value) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a complete HTTPS stream URL.'); }
  if (url.protocol !== 'https:') throw new Error('Use an HTTPS stream URL so it can play securely in the installed app.');
  if (url.username || url.password) throw new Error('Use a stream URL without a username or password.');
  if (/\.(m3u8?|pls|xspf)\/?$/i.test(url.pathname)) throw new Error('Use the direct MP3/AAC audio URL, rather than a playlist file.');
  url.hash = '';
  return url.href;
}

// A streaming media element feeds the same gains and sleep fade as local audio.
// crossOrigin must precede src: streams must explicitly permit CORS access.
export class RadioLayer {
  constructor(context, sound, destination, onStatus = () => {}) {
    this.sound = sound;
    this.onStatus = onStatus;
    this.media = new Audio();
    this.media.crossOrigin = 'anonymous';
    this.media.preload = 'none';
    this.media.setAttribute('playsinline', '');
    this.source = context.createMediaElementSource(this.media);
    this.gain = context.createGain();
    this.gain.gain.value = 0;
    this.source.connect(this.gain).connect(destination);
    this.active = false;
    this.revision = 0;
    this.media.addEventListener('playing', () => {
      if (!this.active) return;
      clearTimeout(this.timeout); this.report('playing', 'Live · Internet required');
    });
    this.media.addEventListener('waiting', () => { if (this.active) { this.report('loading', 'Buffering…'); this.armTimeout(); } });
    this.media.addEventListener('error', () => { if (this.active) this.fail('The station could not play. Check its direct stream URL and permission to play on other websites.'); });
    this.media.addEventListener('ended', () => { if (this.active) this.fail('The stream ended. Retry to reconnect.'); });
  }
  report(state, message) { this.state = state; this.onStatus(this.sound.id, { state, message }); }
  armTimeout() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.fail('The station is not responding. Retry when your connection is ready.'), 15000);
  }
  start() {
    if (this.active) return;
    if (navigator.onLine === false) { this.report('offline', 'Offline · Connect to play this station'); return; }
    this.active = true;
    const revision = ++this.revision;
    this.report('loading', 'Connecting…');
    this.armTimeout();
    this.media.src = this.sound.url;
    this.media.play().catch(error => {
      if (this.active && revision === this.revision) this.fail(error.name === 'NotAllowedError' ? 'Your browser paused this station. Tap Retry to start it.' : 'The station could not play. Check its direct audio URL, connection, and support for playback on other websites.');
    });
  }
  stop() {
    this.active = false; ++this.revision;
    clearTimeout(this.timeout);
    this.media.pause();
    this.media.removeAttribute('src'); this.media.load();
  }
  fail(message) { this.stop(); this.report('error', message); }
  offline() { this.stop(); this.report('offline', 'Offline · Local sounds keep playing'); }
  destroy() { this.stop(); this.source.disconnect(); this.gain.disconnect(); this.report('idle', 'Online only · Direct stream'); }
}
