# Roadmap

## 0.1 — Working foundation

- [x] Public-surface Ambiphone analysis with sources and evidence limits.
- [x] Static HTML/CSS/JavaScript app with original visual identity.
- [x] Six procedural layers, volume controls, local mixes, and a sleep timer.
- [x] PWA manifest, icons, service worker, automated tests, and CI.

## 0.2.0-alpha.1 — Recorded library and mobile mixer

- [x] Inventory 67 reference channels and check 60 original-source licence pages.
- [x] Bundle twelve CC0 / CC BY recordings with loop preparation and credits.
- [x] Add mobile category browsing, two-column cards, and a compact player/mixer sheet.
- [x] Extend saved mixes with update, rename, and duplicate.
- [x] Add batch file-picker imports, stable IDs, duplicate detection, and local removal.
- [x] Store imported recordings in IndexedDB and migrate existing mix recipes to versioned localStorage.
- [x] Cache the whole recording pack offline and add an explicit update action.
- [x] Verify Chromium offline playback, imports, legacy upgrade, and responsive widths.

## 0.3.0-alpha.1 — Categories and internet radio

- [x] Visible category buttons, counts, grouped browsing, and remembered selection.
- [x] Category assignment for custom recordings.
- [x] Locally saved HTTPS radio URLs, shared mixer/timer controls, status, and retry.
- [x] Failed/offline station isolation from local audio and no stream caching.
- [x] Controlled HTTPS/CORS browser checks and an offline-compatible sync proposal.

## 0.4.0-alpha.3 — Media controls

- [x] Media Session metadata, play/pause/stop controls, and playback-state synchronization.
- [x] Browser audio focus and Safari playback audio mode, including the Firefox activation correction.
- [x] User-confirmed media controls on iOS/Safari, iOS/Chrome, Android/Chrome, Android/Firefox, Linux/Chrome, and Linux/Firefox.
- [x] User-confirmed lock-screen operation. See the [device validation record](testing.md#device-confirmation-after-040-alpha3--2026-10-05).

The [saved mixes and custom sound proposal](saved-mixes-and-custom-sounds.md) describes the broader scope. The following remain future work:

- [ ] One-file ZIP export/import containing mix JSON and all referenced custom recordings; restore settings and sounds together, with duplicate detection and clear errors for incomplete archives.
- [ ] Drag-and-drop imports and storage-management controls.
- [ ] Verify storage pressure, offline restart, installation, and playback on physical Android/iOS devices.
- [ ] Long listening sessions for loop repetition, clicks, and relative loudness.
- [ ] Verify interruption recovery, extended background playback, and sleep-timer expiry while locked on Android/iOS.
- [ ] Screen-reader and 200% zoom audits on desktop and mobile.
- [ ] Improve pink-noise spectrum and generated nature textures.
- [ ] Expand the recording catalog and support selective offline downloads.
- [x] Add rain on tent, evening birds, and train carriage ambience on `dev`; clarify the existing dawn recording as Morning birds. See the [source shortlist](research/sound-expansion.md).
- [ ] Listen to the new recording loops for speech, handling noise, relative levels, and repetition.
- [x] Add original binaural generation with separate left/right tones, a headphones hint, and saved-mix support.
- [ ] Versioned mix URLs and stereo placement.
- [ ] Broaden radio compatibility beyond direct CORS-enabled streams, based on real station/device tests.
- [ ] Choose a provider and implement optional sync with local playback copies and missing-asset recovery.

Repository publication does not establish physical-device or listening-test results.
