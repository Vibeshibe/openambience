// Media Session is optional: unsupported actions must never prevent playback.
export class MixMediaSession {
  constructor(actions, session = globalThis.navigator?.mediaSession, Metadata = globalThis.MediaMetadata) {
    this.session = session;
    this.Metadata = Metadata;
    this.names = null;
    if (!session) return;
    for (const [action, handler] of Object.entries(actions)) {
      try { session.setActionHandler(action, handler); } catch {}
    }
    // A looping mix has no track list or seekable timeline.
    for (const action of ['previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto']) {
      try { session.setActionHandler(action, null); } catch {}
    }
  }
  sync(names, state) {
    if (!this.session) return;
    try { this.session.playbackState = state; } catch {}
    // The transport's silent loop is not a ten-second seekable track.
    try { this.session.setPositionState?.(state === 'none' ? undefined : { duration: Infinity, position: 0, playbackRate: 1 }); } catch {}
    const key = JSON.stringify(names);
    if (key === this.names) return;
    try {
      this.session.metadata = names.length && this.Metadata ? new this.Metadata({
        title: names.join(' · '),
        artist: 'OpenAmbience',
        album: 'Your ambient mix',
        artwork: [192, 512].map(size => ({
          src: new URL(`../icons/icon-${size}.png`, import.meta.url).href,
          sizes: `${size}x${size}`, type: 'image/png',
        })),
      }) : null;
      this.names = key;
    } catch {}
  }
}
