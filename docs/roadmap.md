# Roadmap

Current stable release: **1.0.0** (2026-10-22). The post-1.0 milestones below are proposals, ordered by user value and dependencies. Version targets and scope can change with feedback; no delivery dates are promised. A proposal is not an implemented feature.

## Post-1.0 priorities

| Target | Focus | User benefit |
| --- | --- | --- |
| 1.0.x | Reliability and accessibility maintenance | Keep everyday playback, backups and keyboard/screen-reader use dependable. |
| Proposed 1.1 | Personal mixer controls | Place layers left/right and choose a sleep duration/fade that fits the session. |
| Proposed 1.2 | Optional sound packs and offline downloads | Add more ambience without requiring everyone to download every new recording. |
| Proposed 1.3 | Mix organization and recovery | Find favourites, export selected mixes and recover more of the personal library. |
| Later research | Missing-media recovery, optional sync, radio and audio rendering | Explore larger additions after the local workflows and data model are ready. |

### 1.0.x — Maintenance

- [ ] Follow up on Narrator/Firefox announcement quirks: “padding” beneath the logo and reconfirmation of the Play/Mute semantic cleanup.
- [ ] Broaden desktop/mobile screen-reader coverage while preserving the confirmed Tab, Space, Escape and slider behaviour.
- [ ] Verify storage pressure and installation on physical Android/iOS devices.
- [ ] Verify interruption recovery, extended background playback and sleep-timer expiry while locked; retain the already-confirmed mobile listening, cold-start and timer results.
- [ ] Extend focused regression coverage for collection ZIP selection/deduplication, failed writes, library limits and concurrent-tab changes, plus the recent keyboard/accessibility fixes.
- [ ] Keep Node/CI tooling and the Nginx/Alpine image current with relevant security updates.

Compatible fixes ship as 1.0.x patches. New controls and capabilities belong in minor releases; maintenance does not require waiting for the next feature milestone. The [validation record](testing.md) distinguishes user confirmations, automated checks and still-open device cases.

### Proposed 1.1 — Personal mixer controls

- [ ] Add a left/centre/right stereo pan control per ordinary sound layer, with an easy reset to centre. Preserve the separate left/right binaural tones and their headphone behaviour.
- [ ] Offer custom sleep durations and an adjustable fade-out duration, keeping the existing quick presets.
- [ ] Consider temporary per-layer mute and solo controls for balancing a mix without removing its selected layers; define how these temporary actions interact with saving and sharing.
- [ ] Carry new persistent settings through saved mixes and portable exports using an explicitly versioned format. Continue importing existing version 1 links/ZIPs and preserve their existing playback defaults.
- [ ] Keep new controls reachable by keyboard and screen reader and usable on narrow mobile screens.

Recommended first implementation: stereo placement. Keep the first feature release small enough that the new audio routing and export compatibility can be reviewed together.

### Proposed 1.2 — Optional sound packs and offline downloads

- [ ] Add a small set of independently sourced, openly licensed recordings, selected from user requests: possible themes include night forest, rain variations, indoor ambience and journeys.
- [ ] Introduce optional packs with sizes, credits, previews and explicit download/remove actions before substantially increasing the bundled library.
- [ ] Show which packs and mix sounds are available offline, need downloading or failed to download. Removing a cached pack must preserve sound IDs and saved mix references.
- [ ] Keep the current 1.0 sound pack available and its default offline behaviour intact. Optional additions should not silently evict uploaded recordings or clear user data.
- [ ] Review each new recording for speech, handling noise, loop seams and relative loudness. The maintainer's positive feedback on the current library remains recorded separately.

Selective offline caching needs a different readiness model from today's all-library cache. Define that model before changing the service worker; see [architecture](architecture.md).

### Proposed 1.3 — Mix organization and recovery

- [ ] Add saved-mix search, favourites and useful sorting; consider tags or collections once the basic list needs them.
- [ ] Allow uploaded recordings to be renamed without changing their IDs or breaking saved mixes.
- [ ] Offer one ZIP for a selected subset of mixes, with a preview of the referenced recordings and stations.
- [ ] Design an optional full-library backup that also includes unused uploaded recordings, unused station entries and the current unsaved mix. Keep its scope distinct from today's saved-mix backup.
- [ ] Make repeated mix imports easier to manage through explicit keep/skip/rename choices in the preview; never silently replace a named mix.
- [ ] Revisit the 20-saved-mix limit after the list, backup format and restore flow can support larger collections. Raising it also needs an archive-format change; retain version 1 collection import support.
- [ ] Introduce stable mix identities where needed for favourites, recovery and eventual sync, migrating existing entries without changing their names or contents.

Missing-media recovery is a prerequisite for more advanced transfer/sync workflows. Its design must preserve unresolved references and allow explicit relinking instead of silently dropping a layer; current approved deletion behaviour stays unchanged until that replacement flow is defined.

## Later — Research and optional capabilities

These are candidates to explore, not assigned release commitments:

- [ ] **Optional sync:** choose a provider/authentication model, retain playable local copies, show transfer state and keep conflicting edits recoverable. Local playback must remain usable without an account or server. Missing-media handling comes first; see [sync and offline](sync-and-offline.md).
- [ ] **Broader radio support:** improve station diagnostics and investigate compatible playlist resolution/reconnection using real station/browser examples. Document HTTPS/CORS limits; a static app cannot promise universal stream support. Any proxy/service would require a separate opt-in design.
- [ ] **Finished audio export:** investigate rendering a chosen duration of built-in/custom layers to an audio file, with stereo/fade settings and explicit browser memory/file limits. This would be separate from recipe ZIP backups; live radio capture is outside the initial scope.
- [ ] **Generated audio refinements:** improve the pink-noise spectrum and explore more natural generated textures, with listening comparisons and care for existing mix levels and sound identities.
- [ ] **Recording preparation:** consider simple trim/loop preview and optional crossfades for uploaded recordings before attempting a full audio editor.

## Delivery principles

- Preserve the [1.x compatibility contract](versioning.md#stable-1x-compatibility-contract): valid existing links/archives remain readable, sound IDs keep their meaning and migrations preserve user data.
- New pan/timer/library fields need an explicit format design. Do not put unsupported values into version 1 exports or silently omit settings when sharing; explain compatibility when a new format is required.
- Keep the default app local, account-free and usable offline. Sync and network services remain optional; optional pack downloads and sync uploads require clear opt-in.
- Preserve current keyboard, mobile and screen-reader workflows as controls are added. Record validation results without treating publication as evidence of a device check.
- Select the next concrete feature from feedback before implementation; the milestone table is a proposed sequence, not approval to implement every idea at once.

## Delivered milestones

### 0.1 — Working foundation

- [x] Public-surface Ambiphone analysis with sources and evidence limits.
- [x] Static HTML/CSS/JavaScript app with original visual identity.
- [x] Six procedural layers, volume controls, local mixes, and a sleep timer.
- [x] PWA manifest, icons, service worker, automated tests, and CI.

### 0.2.0-alpha.1 — Recorded library and mobile mixer

- [x] Inventory 67 reference channels and check 60 original-source licence pages.
- [x] Bundle twelve CC0 / CC BY recordings with loop preparation and credits.
- [x] Add mobile category browsing, two-column cards, and a compact player/mixer sheet.
- [x] Extend saved mixes with update, rename, and duplicate.
- [x] Add batch file-picker imports, stable IDs, duplicate detection, and local removal.
- [x] Store imported recordings in IndexedDB and migrate existing mix recipes to versioned localStorage.
- [x] Cache the whole recording pack offline and add an explicit update action.
- [x] Verify Chromium offline playback, imports, legacy upgrade, and responsive widths.

### 0.3.0-alpha.1 — Categories and internet radio

- [x] Visible category buttons, counts, grouped browsing, and remembered selection.
- [x] Category assignment for custom recordings.
- [x] Locally saved HTTPS radio URLs, shared mixer/timer controls, status, and retry.
- [x] Failed/offline station isolation from local audio and no stream caching.
- [x] Controlled HTTPS/CORS browser checks and an offline-compatible sync proposal.

### 0.4.0-alpha.3 — Media controls

- [x] Media Session metadata, play/pause/stop controls, and playback-state synchronization.
- [x] Browser audio focus and Safari playback audio mode, including the Firefox activation correction.
- [x] User-confirmed media controls on iOS/Safari, iOS/Chrome, Android/Chrome, Android/Firefox, Linux/Chrome, and Linux/Firefox.
- [x] User-confirmed lock-screen operation. See the [device validation record](testing.md#device-confirmation-after-040-alpha3--2026-10-05).

### 1.0.0 — Stable release (2026-10-22)

- [x] Establish the current mixer, saved-mix, offline, radio, backup/restore and keyboard feature set as the stable baseline.
- [x] Preserve the existing mix formats, stable sound IDs and browser storage when upgrading from 0.9.3.
- [x] Document the [1.x compatibility contract](versioning.md#stable-1x-compatibility-contract), [release notes](releases/1.0.0.md), user-confirmed checks and remaining known limits.
- [x] Publish stable tags through the checked Pages/container pipeline, with a GitHub Release after image publication.

### Delivered features and user confirmations

The [saved mixes and custom sound proposal](saved-mixes-and-custom-sounds.md) contains the historical design. The delivered capabilities and user confirmations below underpin the stable baseline:

- [x] One-file ZIP export/import containing mix JSON and all referenced custom recordings; restore settings and sounds together, with duplicate detection and clear errors for incomplete archives. Released in 0.7.0; see [mix portability](mix-portability.md).
- [x] Drag-and-drop audio/ZIP imports and device storage management, including usage estimates, recording downloads and explicit, atomic removal of referenced layers. Released in 0.8.0; see [storage management](storage-management.md).
- [x] One ZIP for all saved mixes with deduplicated recordings and selective, atomic import that preserves existing mixes and playback. Released in 0.9.0; see [all-mix backups](mix-portability.md#all-saved-mixes-in-one-zip).
- [x] User-confirmed backup/restore and offline cold starts on 2026-10-22; see the [validation record](testing.md#user-confirmation-and-keyboard-follow-up--2026-10-22).
- [x] User-confirmed long-duration mobile listening with successful sleep-timer operation. See the [2026-10-21 validation report](testing.md#user-confirmation-mobile-sessions-sleep-timer-and-zoom--2026-10-21).
- [x] User-confirmed listening quality over several weeks with no noticed artifacts and positive feedback from other users, reported 2026-10-22.
- [x] User-confirmed 200% zoom usability; platform details were not recorded.
- [x] User-confirmed Tab navigation and arrow-key volume adjustment. Add page-level Space playback and reliable skip-link focus in 0.9.2; a full screen-reader audit remains separate.
- [x] Initial user-confirmed Windows Narrator/Firefox check: Space playback, Escape dismissal and popup announcements work. See the [validation record](testing.md#user-confirmation-narrator-with-firefox--2026-10-22).
- [x] Add rain on tent, evening birds, and train carriage ambience on `dev`; clarify the existing dawn recording as Morning birds. See the [source shortlist](research/sound-expansion.md).
- [x] Add original binaural generation with separate left/right tones, a headphones hint, and saved-mix support.
- [x] Versioned mix URLs with validated previews and saved timer settings, released in 0.7.0.

Repository publication does not establish physical-device or listening-test results.
