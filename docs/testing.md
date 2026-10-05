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

## Recorded 0.3.0-alpha.5 validation — 2026-09-30

Syntax checks and all four Node test files passed, including new assertions for OR category matching, overlap without duplicates, legacy migration, and malformed storage. Focused Chromium checks passed for multiple checkboxes, Space toggling, search intersection, the collapsed summary, persisted multi-selection after offline reload, Clear filters overriding the old preference, empty selection showing all sounds, and In your mix combined with a category without stopping playback. Touch rows remained at least 44px high, with no overflow at 320/390/768/1440px widths. The checkbox panel screenshot was reviewed. Existing browser harness selectors were updated for checkbox controls; the unchanged audio suites were not rerun for this filtering change.

## Recorded 0.3.0-alpha.6 validation — 2026-09-30

Syntax checks, all four Node test files, and the complete Chromium library/offline suite passed with the new import dialog. A focused Chromium check verified category suggestions, assigning a category to a batch of imports, uploaded tags appearing only on imported cards, and imported recordings appearing beside built-in sounds. Combining a category with My sounds showed each recording once. Editing a category, duplicate rejection, category persistence after offline reload, and saved-mix playback using imported audio passed. No uncaught browser errors or horizontal overflow occurred at 320/390/768/1440px widths; mobile dialog and card screenshots were reviewed.

Both browser harnesses were updated for the import dialog. The radio harness passed syntax validation but was not rerun for this change. Physical-device and assistive-technology checks remain outstanding as described above.

## Recorded 0.3.0-alpha.7 validation — 2026-09-30

Syntax checks and all four Node test files passed. A focused Chromium check verified the footer repository link, keyboard focus, a minimum 44px touch target, and no horizontal overflow at 320/390/768/1440px widths. The mobile footer screenshot was reviewed. The updated app loaded all eighteen sounds and passed service-worker control, offline reload, and recorded playback checks locally.

## Recorded 0.3.0-alpha.8 validation — 2026-09-30

Syntax checks, all four Node test files, and the Chromium 153 library/offline suite passed. The import checks now cover a mixed batch containing a text file and valid extensionless MP3 with a generic MIME type, a PNG, invalid WAV data, and document data disguised as an MP3. Only decodable audio was saved; invalid selections produced feedback and valid imports survived offline reload and playback. Duplicate detection, saved mixes, timer expiry, and responsive layouts also passed.

The file input now omits `accept` to request general file browsing instead of suggesting a media picker. Browser automation supplies files directly and cannot verify Android's native picker; that change still needs physical Android testing. The browser and operating system determine the final picker UI. See [MDN's file-type hint documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/accept).

## Recorded 0.4.0-alpha.1 validation — 2026-10-05

Syntax checks and all five Node test files passed. Chromium 153.0.8010.12 passed the library/offline and controlled HTTPS radio suites, plus `scripts/media-session-browser-check.cjs`:

- No autoplay on initial or offline reload; empty selections cannot start playback.
- Native Media Session metadata, selected-sound updates, and resolvable app artwork.
- Idempotent play/pause handlers, stop preserving the selection, and empty-mix cleanup.
- Pause during delayed audio decoding, failed decoding, and explicit resume afterward.
- A simulated AudioContext interruption updates the UI and session without automatically resuming.
- Sleep expiry updates playback state; resume starts the chosen timer again; stop cancels it.
- Offline reload/playback and working in-app controls with the Media Session API absent.

Run the new harness with the same external Playwright setup described above:

```sh
PLAYWRIGHT_MODULE=/tmp/openambience-tools/node_modules/playwright node scripts/media-session-browser-check.cjs
```

The harness invokes the registered action callbacks and inspects the browser's native metadata/state. It does **not** establish OS notification visibility, hardware-key delivery, background survival, or physical lock-screen behavior. The simulated clock is installed before the app creates its timer interval.

The initial informal Linux report was superseded by follow-up testing: the user reported missing controls on Linux/Firefox, Android/Chrome, and Android/Firefox. Safari playback was silenced by the iPhone silent switch. The callback-only tests above did not catch the missing persistent audio focus.

On physical Android/iOS devices, start a mix with generated sounds only, then repeat with recordings, imports, and radio. Check notification artwork and names, hardware/lock-screen play/pause/stop, background timer expiry, incoming-call interruptions, and explicit resume. Confirm stop preserves the mix and that no unexpected sound returns after an interruption.

Media Session is a progressive enhancement. The [specification](https://www.w3.org/TR/mediasession/) leaves media-session activation to the browser; Chrome's [implementation notes](https://developer.chrome.com/blog/media-session#implementation-notes) describe additional audio-focus limits for Web Audio. Setting metadata and handlers alone does not guarantee that a browser exposes OS controls for a Web Audio mix. Platform audio-focus/background integration remains part of device follow-up work.

## 0.4.0-alpha.2 media-focus correction

Syntax checks, all six Node test files, and the library/offline, radio, media-session, and Linux system-media browser suites passed with Chromium 153.0.8010.12. The radio harness now identifies stream elements by their CORS setting so it does not mistake the silent transport for a radio station.

The previous Web Audio-only mixer produced `Ambient Active Playing` audio focus in Chromium 153. A MediaStream output experiment did not establish a persistent media session. A silent ten-second PCM media element feeding the existing Web Audio graph produces `Gain Active Playing { HasAudio } Controllable` instead. The element starts from the Play gesture, pauses with the mix, and releases its Blob URL on stop/reset. It generates no network requests and no audible samples.

The Linux harness checks that persistent focus and sends Pause/Play/Stop through Chromium's actual MPRIS service on an isolated D-Bus session. It never sends commands to other desktop players:

```sh
PLAYWRIGHT_MODULE=/tmp/openambience-tools/node_modules/playwright node scripts/system-media-browser-check.cjs
```

Requires `dbus-daemon` and `gdbus`; set `CHROMIUM_EXECUTABLE` for an existing browser. This is stronger than invoking JavaScript callbacks, but it does not establish Firefox or physical Android/iOS compatibility. Re-test those devices on **v0.4.0-alpha.2**, including Safari with the silent switch on. Safari's optional Audio Session API is set to `playback`, following [WebKit's guidance](https://bugs.webkit.org/show_bug.cgi?id=237322#c6).

## Device reports after 0.4.0-alpha.2

The user reports working media controls on iOS/Safari, iOS/Chrome, Android/Chrome, and Linux/Chrome. Firefox on Android and Linux still lacked controls. Exact browser/OS versions and the individual controls tested were not supplied. This records those reports without treating them as a full background, interruption, or sleep-timer audit.

## 0.4.0-alpha.3 Firefox correction

Syntax checks and all six Node test files passed. Firefox 140.16.0 ESR passed the new native-control/output-silence harness using geckodriver 0.37.1. Chromium 153.0.8010.12 passed its native Linux media-control, media-session, library/offline, and controlled-radio suites.

Firefox's [media-control activation logic](https://github.com/mozilla/gecko-dev/blob/master/dom/html/HTMLMediaElement.cpp) requires an audible decoded track; the all-silent alpha.2 transport did not create a Linux MPRIS service. The replacement has non-silent PCM samples routed through a dedicated gain of zero, established before playback. The media element remains unmuted; no control-track samples reach the audible mixer output. Browser detection is not required.

The Linux Firefox harness uses the installed browser, Mozilla's [geckodriver](https://github.com/mozilla/geckodriver/releases), and an isolated D-Bus session. It verifies non-silent decoder input, exactly zero output after the silencer, and real OS Pause/Play/Stop commands without invoking the JavaScript action handlers directly:

```sh
GECKODRIVER=/path/to/geckodriver node scripts/firefox-media-browser-check.cjs
```

Set `FIREFOX_BINARY` for a browser other than `/usr/bin/firefox` and `PREVIEW_URL` for another server. Requires `dbus-daemon` and `gdbus`. The automated Linux result alone does not establish Android notification behavior; the subsequent device retest is recorded below.

## Device confirmation after 0.4.0-alpha.3 — 2026-10-05

The user confirmed successful media controls on all previously tested clients:

| Platform | Browsers | Media controls |
| --- | --- | --- |
| iOS | Safari, Chrome | Passed user testing |
| Android | Chrome, Firefox | Passed user testing |
| Linux | Chrome, Firefox | Passed user testing |

The user also explicitly confirmed operation on lock screens. This supersedes the Firefox failures and outstanding device retest noted in the earlier release records.

Exact browser/OS versions, test duration, and a per-action/per-device checklist were not recorded. Interruption recovery, extended background sessions, and sleep-timer expiry while locked remain separate tests; this confirmation does not claim those were exercised.

## Release checklist

- Increment the service-worker cache name after changing cached assets.
- Verify old tabs keep a consistent version and closing/reopening activates the update.
- Check new asset licenses and attribution entries.
- Record actual browser/OS versions and results; do not infer mobile compatibility from desktop tests.


## 0.4.0-alpha.4 volume popout preview — 2026-10-05

- Chromium 153 checks passed for the vertical master range at 320, 390, 768, and 1440px widths, with 44px-or-larger touch targets and no horizontal overflow. The popout also fits a 568×320 landscape viewport.
- Verified touch position, Arrow Up/Down, Home/End, visible percentage updates, focus on opening, Escape focus restoration, Tab leaving the group, toggle dismissal, outside-click dismissal, and closing when Mix options opens.
- Mute/unmute still changes the actual master gain and restores the previous volume. The library/offline and radio suites passed with the new controls.
- Firefox 140.16 ESR passed native vertical pointer/keyboard adjustment, percentage updates, and Escape/Tab/outside dismissal. Linux system-media checks also passed in Firefox and Chromium.
- Desktop/mobile Chromium and narrow Firefox screenshots were reviewed. Physical Android/iOS touch testing and feedback on the new layout remain pending; earlier media-control device confirmations apply to alpha.3.


## 0.4.0-alpha.5 circular player preview — 2026-10-05

- Chromium verified square 52px controls in Options / Play / Volume order, with Play centered at 320, 390, 768, and 1440px viewport widths. Reviewed mobile and desktop screenshots.
- The percentage remains inside the popout; the speaker icon opens it and indicates mute state. Existing touch, keyboard, short-landscape, playback, actual master-gain mute/restore, and offline checks passed.
- Tab moves from the slider to Mute, then leaves and closes the popout. Chromium and Firefox passed this flow, Escape restoration, and outside dismissal. Firefox system-media controls also passed.
