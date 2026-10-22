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

## 1.0.0 — Stable release (2026-10-22)

- [x] Establish the current mixer, saved-mix, offline, radio, backup/restore and keyboard feature set as the stable baseline.
- [x] Preserve the existing mix formats, stable sound IDs and browser storage when upgrading from 0.9.3.
- [x] Document the [1.x compatibility contract](versioning.md#stable-1x-compatibility-contract), [release notes](releases/1.0.0.md), user-confirmed checks and remaining known limits.
- [x] Publish stable tags through the checked Pages/container pipeline, with a GitHub Release after image publication.

## Feature status and follow-up work

The [saved mixes and custom sound proposal](saved-mixes-and-custom-sounds.md) describes the broader scope. The unchecked validation items and future capabilities below remain tracked after the 1.0 milestone:

- [x] One-file ZIP export/import containing mix JSON and all referenced custom recordings; restore settings and sounds together, with duplicate detection and clear errors for incomplete archives. Released in 0.7.0; see [mix portability](mix-portability.md).
- [x] Drag-and-drop audio/ZIP imports and device storage management, including usage estimates, recording downloads and explicit, atomic removal of referenced layers. Released in 0.8.0; see [storage management](storage-management.md).
- [x] One ZIP for all saved mixes with deduplicated recordings and selective, atomic import that preserves existing mixes and playback. Released in 0.9.0; see [all-mix backups](mix-portability.md#all-saved-mixes-in-one-zip).
- [x] User-confirmed backup/restore and offline cold starts on 2026-10-22; see the [validation record](testing.md#user-confirmation-and-keyboard-follow-up--2026-10-22).
- [ ] Verify storage pressure and installation on physical Android/iOS devices.
- [x] User-confirmed long-duration mobile listening with successful sleep-timer operation. See the [2026-10-21 validation report](testing.md#user-confirmation-mobile-sessions-sleep-timer-and-zoom--2026-10-21).
- [x] User-confirmed listening quality over several weeks with no noticed artifacts and positive feedback from other users, reported 2026-10-22.
- [ ] Verify interruption recovery, extended background playback, and sleep-timer expiry while locked on Android/iOS.
- [x] User-confirmed 200% zoom usability; platform details were not recorded.
- [x] User-confirmed Tab navigation and arrow-key volume adjustment. Add page-level Space playback and reliable skip-link focus in 0.9.2; a full screen-reader audit remains separate.
- [x] Initial user-confirmed Windows Narrator/Firefox check: Space playback, Escape dismissal and popup announcements work. See the [validation record](testing.md#user-confirmation-narrator-with-firefox--2026-10-22).
- [ ] Follow up on the reported announcement quirks and complete broader desktop/mobile screen-reader coverage.
- [ ] Improve pink-noise spectrum and generated nature textures.
- [ ] Expand the recording catalog and support selective offline downloads.
- [x] Add rain on tent, evening birds, and train carriage ambience on `dev`; clarify the existing dawn recording as Morning birds. See the [source shortlist](research/sound-expansion.md).
- [ ] Optional detailed per-recording listening audit for speech and handling noise; general app listening quality is user-confirmed.
- [x] Add original binaural generation with separate left/right tones, a headphones hint, and saved-mix support.
- [x] Versioned mix URLs with validated previews and saved timer settings, released in 0.7.0.
- [ ] Stereo placement.
- [ ] Broaden radio compatibility beyond direct CORS-enabled streams, based on real station/device tests.
- [ ] Choose a provider and implement optional sync with local playback copies and missing-asset recovery.

Repository publication does not establish physical-device or listening-test results.
