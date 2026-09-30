# Validation

## Automated checks

Run `npm run check` and `npm test` on Node.js 22+. Tests cover input normalization, invalid and unavailable storage, independent saved-state snapshots, custom IDs, legacy migration, recording attribution/checksums, finite/non-silent audio buffers, loop endpoint continuity, and the relative smoothness of brown noise. They do not establish perceived audio quality or browser compatibility.

## Browser checklist

1. Serve with `npm start`. Load the app and confirm no audio starts automatically.
2. Choose rain and brown noise. Play, vary each volume and master volume, then pause and resume. Listen for abrupt transitions.
3. Save a named mix, change settings, and load it again. Reload and confirm the mix survives but playback remains paused. Delete the saved mix.
4. Search for a sound and for a nonexistent term. Clear the search and confirm all eighteen return.
5. Set the sleep timer and confirm the displayed countdown, last-five-second fade, and stopped playback. Pause/resume should start a fresh selected duration. Change master volume mid-timer and confirm the fade still happens.
6. Wait for service-worker installation, reload, go offline, and reload again. Play several layers while offline.
7. Repeat at narrow mobile widths and 200% zoom; confirm controls remain visible and usable. Traverse controls with Tab and activate buttons with Enter/Space.
8. Load under a subdirectory to test project-hosted deployment paths.
9. Test on actual iOS/Safari and Android devices: installation, locked screen, background tabs, interruptions, long sessions, and timer suspension.

## Recorded starter validation — 2026-09-30

Syntax checks and both Node test files passed. Automated Chromium 153.0.8010.12 checks passed for initial silence, selecting layers, Web Audio running/suspended state, volume changes, saving/loading/deleting mixes (including a name with angle brackets), reload persistence without autoplay, search and empty results, timer expiry using an advanced browser clock, offline reload and playback, reset, and no uncaught browser errors. Desktop and 390px-wide mobile screenshots were reviewed; no horizontal overflow was detected.

An additional check passed for hosting under `/openambience/`, including the scoped service worker and offline playback, 320px layout without horizontal overflow, and keyboard access to the skip link.

These browser checks used a temporary external Playwright harness, not a committed dependency. The timer test verified deadline behavior, not a real-time fifteen-minute listening session. Audio fidelity, the audible fade, screen-reader behavior, physical mobile devices, and lock-screen playback remain manual checks.

## Recorded 0.2.0-alpha.1 validation — 2026-09-30

- Syntax checks and all three Node test files passed.
- Chromium 153.0.8010.12 passed no-autoplay, recorded playback, six-layer limit, per-layer/master volume, saved mix create/load/rename/duplicate/delete, local import, duplicate import rejection, invalid-format rejection, and reload persistence.
- With network disabled, all twelve bundled recordings decoded to non-silent PCM; a saved mix containing imported audio played after reload.
- Timer expiry and custom-recording removal (including saved-mix references) passed. No uncaught browser errors occurred.
- No horizontal overflow at 320, 390, 768, or 1440 pixels. Mobile, desktop, and mixer-sheet screenshots were reviewed.
- A cached 0.1.0 worker upgraded after its final tab closed and worker activation completed. Legacy mix names, procedural IDs, and volumes survived. A separate check passed for `/openambience/` hosting, offline recording playback, and keyboard access to the skip link.

These are desktop Chromium checks with viewport/touch emulation. Actual Android/iOS installation, background playback, lock-screen behavior, audible loop quality, and assistive technology checks remain manual validation.

### Reproduce the browser checks

The optional harness is `scripts/browser-check.cjs`. It uses a fresh isolated browser profile and leaves screenshots in your system temporary directory. The app has no Playwright runtime dependency. With the local preview running, install Playwright in a separate tools directory:

```sh
npm install --prefix /tmp/openambience-tools playwright
/tmp/openambience-tools/node_modules/.bin/playwright install chromium
PLAYWRIGHT_MODULE=/tmp/openambience-tools/node_modules/playwright node scripts/browser-check.cjs
```

Set `CHROMIUM_EXECUTABLE` if using an existing browser binary, and `PREVIEW_URL` to test another serving address. The harness validates timer deadlines by advancing a browser clock; it does not run a real-time fifteen-minute listening session.

## Recorded 0.3.0-alpha.1 validation — 2026-09-30

- Syntax checks and all four Node test files passed, including category membership, reassigned imports, radio URL validation, and saved station IDs.
- The existing Chromium library suite passed with remembered category selection: imports, saved mixes, offline reload, all twelve decoded recordings, and timer behavior.
- A separate Chromium 153 suite served a bundled recording from a local HTTPS fixture station. CORS-enabled playback produced nonzero samples through the Web Audio media source; CORS-blocked playback showed an error while a local noise layer kept running.
- Verified station URL validation, duplicate detection, no station requests on save, per-station/master volume controls, pause/deselection/removal connection release, saved-mix persistence, offline local playback with radio selected, reconnect/retry, and timer-driven stream stop.
- Confirmed station responses were absent from service-worker caches, and deleting a station removed its saved-mix references. Pause still works after deselecting the last layer.
- Category counts, custom-category persistence, and 320/390/768/1440px layouts passed. Mobile category/radio screenshots were reviewed.

Run the radio harness with the same Playwright setup as above. It additionally requires `openssl` on PATH and a free loopback port 8443. It creates a temporary self-signed certificate, trusts that certificate only in its isolated test context, and removes its certificate files on exit. No public station or third-party service is contacted.

```sh
PLAYWRIGHT_MODULE=/tmp/openambience-tools/node_modules/playwright node scripts/radio-browser-check.cjs
```

The fixture verifies browser streaming controls and CORS behavior with known audio. It does not establish compatibility with arbitrary station servers or codecs. Physical Android/iOS, background/lock-screen behavior, and overnight listening remain manual checks.

## Recorded 0.3.0-alpha.2 validation — 2026-09-30

- Syntax checks and all four Node test files passed.
- Chromium 153 confirmed play/pause, mute, and Mix targets measure at least 44×44 CSS pixels at 320, 390, 768, and 1440px widths; the master slider remains visible and at least 80px wide, with no page overflow.
- A touch tap and keyboard arrow changed master volume. Mute/unmute changed the actual Web Audio master gain to zero and back to the previous level without pausing playback; moving the slider to zero also updated the mute state.
- The complete library/offline suite and controlled HTTPS radio suite passed with master volume in the player. Radio remained connected while muted, and pause/timer expiry still released its connection.
- Mobile screenshots were reviewed. These checks use browser emulation; physical-device validation remains as listed above.

## Recorded 0.3.0-alpha.3 validation — 2026-09-30

Syntax checks passed. A focused Chromium check verified the Mix options button and dialog names, a 48×48px touch target at 320/390/768/1440px widths, a usable master slider, touch and Enter opening, Escape and Close dismissal, and focus returning to the opener. No page overflow or uncaught browser errors occurred. The player screenshot was reviewed. Playback logic was unchanged, so the broader audio suites were not repeated for this icon change.

## Recorded 0.3.0-alpha.4 validation — 2026-09-30

Syntax checks, the library browser suite, and the controlled radio suite passed. A focused Chromium check verified collapsed-by-default filters, the active category/count summary, Enter/touch disclosure controls, native radio arrow-key selection, search/category intersection, Clear filters, empty states, and remembered category selection after an offline reload. Filtering did not interrupt playback. Radio rows remained at least 44px tall with no page overflow at 320/390/768/1440px widths. Expanded and collapsed mobile screenshots were reviewed. Physical-device checks remain outstanding.

## Release checklist

- Increment the service-worker cache name after changing cached assets.
- Verify old tabs keep a consistent version and closing/reopening activates the update.
- Check new asset licenses and attribution entries.
- Record actual browser/OS versions and results; do not infer mobile compatibility from desktop tests.
