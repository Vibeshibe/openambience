# Changelog

App releases use [Semantic Versioning](docs/versioning.md). Research checkpoints on `dev` may precede the next release.

## Unreleased

- Publish the site owner's Google Search Console HTML verification file.

## 0.5.1 — 2026-10-05

- Fix the offline footer checking an outdated cache name after a service-worker update. Ask the active worker to verify its complete cached library and report unavailable or incomplete storage explicitly.
- Add Open Graph and Twitter card metadata using the existing PNG logo for shared-link previews.
- Add a canonical URL, descriptive search title and summary, crawlable introductory text, and a sitemap for the public app.
- Document search indexing verification and sitemap submission; refresh the offline shell for the updated page.

## 0.5.0-alpha.2 — 2026-10-05

Promoted to `main` with the expanded sound library, binaural presets, and update reminder.

- Give binaural beats their own category with three mobile-friendly preset cards (2, 6, and 10 Hz), replacing the dropdown. Preserve exact frequencies and levels in older saved mixes.
- Sort sound cards alphabetically within each category, including imported sounds and radio stations.
- Keep cards aligned at the top at their natural height, so the binaural controls do not stretch neighboring cards.
- Replace the deferred update text link with a square bell button and a softly pulsing red dot. Reduced-motion preferences keep the dot still.

## 0.5.0-alpha.1 — 2026-10-05

Development preview on `dev` for listening feedback.

- Added Rain on tent, Evening birds, and Train carriage recordings with source licences, checksums, and preparation details. Longer 60-second bird/train loops reduce the repeat frequency.
- Renamed Birdsong to Morning birds while retaining its original sound ID, audio file, and saved-mix compatibility.
- Added original binaural generation with separate left/right tones, a headphones hint, and a saved beat-difference selector from 2 to 30 Hz.
- Include all 22 sounds and the new tone module offline; retain layer volume, master/mute, timer, and media controls.
- Added real stereo-render, frequency-change, oscillator-cleanup, saved-mix, offline, and Firefox checks. Human listening and physical-device validation of the new sounds remain pending.

## 0.4.0-alpha.7 — 2026-10-05

Promoted to `main` with the quiet update notice and optional deferral.

- Show a quiet, nonmodal card below the header when an update is ready, with Update & reload and Later actions and a clear playback warning.
- Later hides the card for the current visit and leaves a small Update available button to reopen it, without interrupting audio or taking focus on arrival.
- Listen for activation before requesting it; only the tab choosing Update & reload pauses and reloads. Other tabs keep playing and remove stale update notices.
- Added an integration check using real service-worker upgrades on an isolated local origin, covering deferral, persistence, layout, and two-tab playback.

## 0.4.0-alpha.6 — 2026-10-05

Promoted to `main` with the vertical volume popout and refined playback controls.

- Reduced Options and Volume to 44px circles, vertically centered beside the 52px Play button.
- Moved the selection count and countdown into Mix options, removing loose text from the resting player.
- Keep routine playback feedback available to screen readers and other action messages in a dismissible notice above the controls.

## 0.4.0-alpha.5 — 2026-10-05

Development preview on `dev`, refining the player layout.

- Centered Play between circular Mix options (left) and speaker (right) buttons, all with 52px targets.
- The speaker opens the vertical volume popout; the percentage and mute/unmute action now live inside it.
- Keep the speaker icon in sync with mute state and close the popout when keyboard focus leaves its controls.

## 0.4.0-alpha.4 — 2026-10-05

Development preview on `dev` for volume-control feedback.

- Moved master volume into a vertical popout with a large percentage above the track and a persistent percentage button in the player.
- Kept one-tap mute/unmute alongside it; added Escape, outside-click, and focus-leave dismissal with keyboard and touch adjustment.
- Size the slider to available height on short screens and refresh the offline shell for the new controls.

## 0.4.0-alpha.3 — 2026-10-05

- Fixed Firefox media-control activation by giving the control track non-silent decoded samples and routing them through a dedicated zero-gain node before they can reach the mix.
- Added a Firefox/Linux integration check for real MPRIS Pause/Play/Stop commands and exact silence at the control track's output.
- User testing confirmed media controls on iOS/Safari, iOS/Chrome, Android/Chrome, Android/Firefox, Linux/Chrome, and Linux/Firefox, plus lock-screen operation.

## 0.4.0-alpha.2 — 2026-10-05

- Fixed missing system media controls by starting a silent local media element with the Web Audio mixer, establishing persistent browser audio focus even for generated-only mixes.
- Request Safari's playback audio mode so the iPhone silent switch does not mute the mix; start both audio APIs directly from the Play gesture.
- Pause the media element with the mixer and release its source on stop/reset. Hide its synthetic duration from media-session position metadata.
- Added a Linux integration check that verifies persistent audio focus and sends actual MPRIS Pause/Play/Stop commands through a private D-Bus session.
- Updated GitHub Actions to Node 24 compatible action releases, pinned the runner to Ubuntu 24.04, and added checks on both Node 22 and Node 24.

## 0.4.0-alpha.1 — 2026-10-05

- Added optional Media Session play, pause, and stop controls with selected-sound names and app artwork.
- Keep system playback state aligned with the mixer, sleep timer, empty selections, and browser audio interruptions. Stop preserves the mix and cancels the timer.
- Prevent a pause during loading from restarting playback; include the new module in the offline cache.

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
