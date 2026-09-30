# Validation

## Automated checks

Run `npm run check` and `npm test` on Node.js 22+. Tests cover input normalization, invalid and unavailable storage, independent saved-state snapshots, finite/non-silent audio buffers, loop endpoint continuity, and the relative smoothness of brown noise. They do not establish perceived audio quality or browser compatibility.

## Browser checklist

1. Serve with `npm start`. Load the app and confirm no audio starts automatically.
2. Choose rain and brown noise. Play, vary each volume and master volume, then pause and resume. Listen for abrupt transitions.
3. Save a named mix, change settings, and load it again. Reload and confirm the mix survives but playback remains paused. Delete the saved mix.
4. Search for a sound and for a nonexistent term. Clear the search and confirm all six return.
5. Set the sleep timer and confirm the displayed countdown, last-five-second fade, and stopped playback. Pause/resume should start a fresh selected duration. Change master volume mid-timer and confirm the fade still happens.
6. Wait for service-worker installation, reload, go offline, and reload again. Play several layers while offline.
7. Repeat at narrow mobile widths and 200% zoom; confirm controls remain visible and usable. Traverse controls with Tab and activate buttons with Enter/Space.
8. Load under a subdirectory to test project-hosted deployment paths.
9. Test on actual iOS/Safari and Android devices: installation, locked screen, background tabs, interruptions, long sessions, and timer suspension.

## Recorded starter validation — 2026-09-30

Syntax checks and both Node test files passed. Automated Chromium 153.0.8010.12 checks passed for initial silence, selecting layers, Web Audio running/suspended state, volume changes, saving/loading/deleting mixes (including a name with angle brackets), reload persistence without autoplay, search and empty results, timer expiry using an advanced browser clock, offline reload and playback, reset, and no uncaught browser errors. Desktop and 390px-wide mobile screenshots were reviewed; no horizontal overflow was detected.

An additional check passed for hosting under `/openambience/`, including the scoped service worker and offline playback, 320px layout without horizontal overflow, and keyboard access to the skip link.

These browser checks used a temporary external Playwright harness, not a committed dependency. The timer test verified deadline behavior, not a real-time fifteen-minute listening session. Audio fidelity, the audible fade, screen-reader behavior, physical mobile devices, and lock-screen playback remain manual checks.

## Release checklist

- Increment the service-worker cache name after changing cached assets.
- Verify old tabs keep a consistent version and closing/reopening activates the update.
- Check new asset licenses and attribution entries.
- Record actual browser/OS versions and results; do not infer mobile compatibility from desktop tests.
