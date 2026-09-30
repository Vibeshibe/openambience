# Internet radio

Choose **＋ Radio**, enter a name and a direct HTTPS audio-stream URL, and save it. Select the station's card, then press Play. Stations appear in the Radio category and can be included in saved mixes with local recordings or generated noise.

## Supported streams

This version uses the browser's native audio decoder with a streaming media element. Direct MP3/AAC endpoints are the intended inputs; exact codec support depends on the browser. A station homepage is not an audio stream. Playlist files (`.m3u`, `.m3u8`, `.pls`, `.xspf`) are rejected; playlist parsing and HLS-specific support are not included.

The stream server must support CORS access from the app's origin, for example `Access-Control-Allow-Origin: *` for a public stream. The media element uses anonymous cross-origin access. Redirect destinations must also be compatible. We connect that element through Web Audio so station volume, master volume, and the sleep fade use the same controls on all supported browsers. The [Web Audio specification](https://www.w3.org/TR/webaudio-1.1/#MediaElementAudioSourceNode-security) requires silence for media that is not CORS-authorized. The app reports an error when the browser rejects a station; it does not add a proxy or bypass server restrictions.

## Playback and storage

- Saving a station only stores metadata locally; it makes no request to the station.
- Playback contacts the station directly. The station's usual data usage and privacy practices apply.
- Up to twenty station entries can be saved. The existing six-layer mix limit includes stations.
- Loading and buffering time out after fifteen seconds without playback. A failed station shows a Retry control while local layers continue.
- Pause, deselection, removal, and sleep-timer expiry release the streaming connection.
- Going offline disconnects stations and keeps local audio running. Reconnect and choose Retry or pause/play to reconnect deliberately.
- Radio URLs remain saved offline. Streams are excluded from the offline pack and service-worker caches; broadcasts are not recorded.

Station availability, codecs, and playback permission vary. Automated browser checks use controlled CORS-enabled and CORS-blocked audio endpoints, not a guarantee for every internet station. Physical iOS/Android and lock-screen playback remain device tests.
