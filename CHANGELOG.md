# Changelog

App releases use [Semantic Versioning](docs/versioning.md). Research checkpoints on `dev` may precede the next release.

## 0.3.0-alpha.8 — 2026-09-30

- Removed the media-type picker hint so imports request general file browsing on mobile browsers.
- Clarified that unreadable or unsupported files are skipped and improved audio-decoding feedback; valid files in a mixed batch still import.
- Removed GitHub Pages deployment instructions from the README.

## 0.3.0-alpha.7 — 2026-09-30

- Prepared GitHub Pages publishing from main with a static `.nojekyll` site and a public app link.
- Added a touch-friendly GitHub repository link in the app footer.
- Added an AI usage disclosure to the README and explained the separate storage used by the hosted app.

## 0.3.0-alpha.6 — 2026-09-30

Development preview on `dev`; 0.3.0-alpha.5 was promoted to `main` at `856ac84` and tagged.

- Added a file-import dialog with category selection, a suggestion from the current filter, and batch category assignment.
- Added Uploaded source badges and visible category labels to imported sound cards, including previously saved imports.
- Kept imported recordings alongside built-in sounds within their chosen category, with per-card category editing and the My sounds shortcut.
- Kept invalid/duplicate-file feedback in the import dialog and revealed successfully imported recordings in their selected category.

## 0.3.0-alpha.5 — 2026-09-30

- Changed category filters to checkboxes: matching any selected category includes a sound, with no duplicates for overlapping categories.
- No selections includes all categories; Clear filters resets both selections and search text.
- Persisted multiple selections and migrated the previous single-category preference without changing mixes or recordings.
- Added coverage for combined filters, overlapping matches, migration, and invalid filter storage.

## 0.3.0-alpha.4 — 2026-09-30

Development preview on `dev`; the previous player/options version was promoted to `main` at `99355ed` and tagged `v0.3.0-alpha.3`.

- Replaced the category button grid with a collapsed-by-default Filters disclosure and native single-choice controls.
- Kept the selected category and result count visible while collapsed; search and saved category selection continue to work together.
- Added Clear filters to reset category and search, and retained accessible touch targets and keyboard controls.

## 0.3.0-alpha.3 — 2026-09-30

- Replaced the player’s Mix text button with a three-dot Mix options icon, matching the panel’s secondary actions.
- Kept a 48px touch target, explicit accessible name, descriptive tooltip, and dialog association; renamed the panel to Mix options.
- Documented the UI hierarchy: direct playback controls, contextual mix actions, and visible library navigation.

## 0.3.0-alpha.2 — 2026-09-30

Development preview on `dev`; 0.3.0-alpha.1 was promoted to `main` at `0856981` and tagged.

- Replaced the wide text transport with a 52px play/pause icon button and accessible state labels.
- Moved master volume into the persistent player, with a larger slider thumb and a mute/unmute button that restores the previous audible level during the session.
- Kept mix saving and sleep-timer controls in the Mix panel, with selected-sound and timer information above the player.
- Verified touch target sizes, touch/keyboard volume, actual master gain on mute/unmute, offline recordings, and radio/timer behavior in Chromium.

## 0.3.0-alpha.1 — 2026-09-30

Development preview on `dev`; the preceding 0.2.0-alpha.1 state was promoted to `main` at `32c9afe`.

- Replaced the scrolling category strip with visible category buttons, counts, grouped browsing, and remembered navigation.
- Added Weather, Water, Wildlife, Indoors, Noise & textures, My sounds, Radio, and In your mix filters; local imports can be assigned a category.
- Added locally saved HTTPS radio URLs, shared mixing/volume/timer controls, connection status and retry, and per-station failure isolation.
- Kept radio online-only, with no stream recording/caching and no station requests when simply saving URLs.
- Documented local storage and a proposed offline-compatible sync architecture; no sync backend or uploads were added.

## 0.2.0-alpha.1 — 2026-09-30

Development preview on `dev`.

- Added twelve independently sourced CC0/CC BY recordings with edited loops, complete attribution, and offline caching.
- Reworked the mobile library with category filters, two-column cards, a compact player, and a mixer sheet.
- Added local multi-file audio imports in IndexedDB, duplicate detection, size/duration limits, and removal.
- Added saved-mix update, rename, and duplicate controls; retained existing mixes and procedural sound IDs.
- Added a six-layer limit, decoded-memory budget, and explicit update control.

### Research and project setup

- Established the `dev` branch and documented versioning, release tags, and regular checkpoint pushes.
- Inventoried 67 Ambiphone channels and independently checked the license labels on 60 directly credited sound-source pages; added Markdown, CSV, and JSON research artifacts.
- Proposed a 12-sound starter pack, five alternative sources, and acquisition/attribution steps; flagged noncommercial content, license discrepancies, and unresolved provenance.
- Documented the next feature scope around saved mixes and local custom-sound imports, including offline storage, migration, missing assets, and recipe portability. The research checkpoint preceded this implementation.

## 0.1.0 — 2026-09-30

- Initial static PWA starter with six procedural sound layers, local mixes, and a sleep timer.
- Ambiphone public-surface analysis, architecture, asset provenance, and roadmap.
- Offline app shell, original icons, automated tests, and CI configuration.
