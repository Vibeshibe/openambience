<p align="center">
  <img src="icons/icon-192.png" alt="" width="80" height="80">
</p>

<h1 align="center">OpenAmbience</h1>

<p align="center">
  <strong>A little room to breathe.</strong><br>
  Mix your own soundscape for focus, relaxation, and rest.<br>
  Open source. Offline capable. No accounts.
</p>

<p align="center">
  <a href="https://github.com/Vibeshibe/openambience/stargazers"><img src="https://img.shields.io/github/stars/Vibeshibe/openambience?style=flat&amp;color=d4e6a2&amp;labelColor=1b302a" alt="GitHub stars"></a>
  <a href="https://github.com/Vibeshibe/openambience/forks"><img src="https://img.shields.io/github/forks/Vibeshibe/openambience?style=flat&amp;color=d4e6a2&amp;labelColor=1b302a" alt="GitHub forks"></a>
  <a href="https://github.com/Vibeshibe/openambience/tags"><img src="https://img.shields.io/github/v/tag/Vibeshibe/openambience?include_prereleases&amp;sort=semver&amp;label=version&amp;color=d4e6a2&amp;labelColor=1b302a" alt="Latest version tag, including previews"></a>
  <a href="https://github.com/Vibeshibe/openambience/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Vibeshibe/openambience/ci.yml?branch=main&amp;label=checks&amp;labelColor=1b302a" alt="Checks on main"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code_license-MIT-d4e6a2?labelColor=1b302a" alt="Code license: MIT"></a>
</p>

<p align="center">
  <a href="https://vibeshibe.github.io/openambience/"><img src="https://img.shields.io/badge/Live_demo-Open_OpenAmbience-d4e6a2?style=for-the-badge&amp;labelColor=1b302a" alt="Live demo — open OpenAmbience" height="32"></a>
</p>

<p align="center">
  <a href="https://vibeshibe.github.io/openambience/">Try it in your browser</a> ·
  <a href="#features">Features</a> ·
  <a href="#run-locally">Run locally</a> ·
  <a href="https://github.com/Vibeshibe/openambience/issues">Report an issue</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

## At a glance

| Make it yours | What you can do |
| --- | --- |
| **18 built-in sounds** | Layer nature recordings and generated noise textures. |
| **Your own recordings** | Import audio, choose categories, and keep it on your device. |
| **Saved mixes** | Return to your favourite combinations with a tap. |
| **Offline listening** | Cache the bundled library and play imported sounds offline. |
| **Internet radio** | Add compatible live streams when you’re online. |
| **Settle in** | Adjust each layer, set a sleep timer, and install the app where supported. |

Development happens on [`dev`](https://github.com/Vibeshibe/openambience/tree/dev). Releases follow [semantic versioning](docs/versioning.md); see the [changelog](CHANGELOG.md).

OpenAmbience is an independent project inspired by the experience of layering sounds in [Ambiphone](https://ambiph.one/). It includes a documented product analysis and a working static PWA starter, with original code and graphics, generated textures, and independently sourced openly licensed recordings. It is not affiliated with Ambiphone and does not redistribute its code or hosted audio files.

## Run locally

Requires **Node.js 22 or newer**. No package installation, build step, API keys, or backend is required.

```sh
cd openambience
npm start
```

Open **http://localhost:8080**. Select some sounds or a preset, then press **Play mix**. Adjust each layer independently and use the master slider to set the overall level.

An alternative is `python3 -m http.server 8080 --bind 127.0.0.1` from this directory. Serve over HTTP locally or HTTPS when deployed; opening `index.html` through `file://` does not support modules and service workers reliably.

## Features

Available in **0.4.0-alpha.5** (`dev` preview):

- Twelve recorded sounds: rain, rain on glass, thunder, forest wind, waves, stream, fireplace, birds, crickets, café, fan, and cat purring.
- Six generated textures, including white, pink, and brown noise. Earlier saved mixes keep their original procedural sounds.
- A phone-friendly two-column library, search, a collapsible Filters panel with multi-select category checkboxes, counts, and a visible active-filter summary, grouped browsing, and a compact player with a mixer panel. Uploaded recordings appear beside built-in sounds in their assigned category, with a small **Uploaded** tag.
- **＋ Radio** saves direct HTTPS radio-stream URLs locally. Compatible stations join the mixer and sleep timer; live playback needs internet and is never cached. See [radio compatibility](docs/internet-radio.md).
- Up to six simultaneous layers, individual volume, and a sleep timer with a five-second fade. The persistent player centers three circular controls: **Mix options** on the left, play/pause in the middle, and a speaker button on the right. The speaker opens a vertical volume slider with a large percentage and mute/unmute; Mix options opens saving and timer controls.
- Twenty named local mixes with load, update, rename, duplicate, and delete controls.
- Choose files and a category in **Add sounds**, then select **Add to library**. A batch shares the chosen category; you can change each recording’s category afterward. **My sounds** still finds every imported recording. Supported formats depend on the browser; MP3 and WAV are good starting points. Files must be mono/stereo, at most 25 MB and two minutes long. Up to 30 imports; identical files are detected.
- Offline caching of the app and the entire bundled library. Wait for **Library ready offline** before disconnecting. Imports are stored locally in IndexedDB; mix recipes use localStorage.
- In-app sound credits, install support, and an update button for future versions.

Recordings are edited, loudness-adjusted excerpts of creator-published MP3 previews under CC0 or CC BY 4.0, acquired directly from Freesound. They are not lossless originals. Attribution, source URLs, modifications, and checksums are in [audio/credits.json](audio/credits.json). Audio assets have separate licences from the MIT application code.

Nothing is uploaded when you import a recording. Clearing browser site data removes custom sounds and saved mixes. Browsers can also evict local storage. Back up original recordings separately; mix export/import remains planned. Pausing cancels the current timer; resuming starts its selected duration again. Playback never starts automatically after reload.

### Media controls

Media Session support exposes play, pause, and stop to supported browser and system media controls, with selected-sound names and app artwork. Stop keeps your selection and cancels the timer; the next play starts the selected timer duration again. Empty mixes clear the session. No seeking or track skipping is offered for looping mixes. Browsers without this API retain the in-app controls.

Media controls are confirmed by user testing on iOS/Safari, iOS/Chrome, Android/Chrome, Android/Firefox, Linux/Chrome, and Linux/Firefox. Lock-screen operation is also confirmed. Interruption recovery and long sessions remain separate validation items. See the [validation checklist](docs/testing.md).

## Research and design

- [Ambiphone analysis and source references](docs/research/ambiphone.md)
- [Complete 67-channel sound inventory](docs/research/ambiphone-sound-inventory.md) ([CSV](docs/research/ambiphone-sound-inventory.csv), [JSON](docs/research/ambiphone-sound-inventory.json))
- [Openly licensed sound candidates and acquisition plan](docs/research/open-audio-sources.md)
- [Proposed saved mixes and custom sound scope](docs/saved-mixes-and-custom-sounds.md)
- [Where sounds are stored and how optional sync could work](docs/sync-and-offline.md)
- [Internet radio support and compatibility](docs/internet-radio.md)
- [Architecture and implementation decisions](docs/architecture.md)
- [Interface design principles](docs/ui-design.md)
- [Roadmap](docs/roadmap.md)
- [Validation checklist](docs/testing.md)
- [Asset provenance](docs/assets.md)
- [Contribution guide](CONTRIBUTING.md)

## Project layout

```text
index.html                 Accessible application shell
styles.css                 Responsive interface
app.js                     UI, persistence, presets, timer, installation
js/audio.js                Web Audio recordings, synthesis, and gain controls
js/media-session.js        Optional system media controls and mix metadata
js/media-transport.js      Silent local media element for browser audio focus
js/catalog.js              Generated bundled recording catalog
js/storage.js              IndexedDB storage for custom audio and station URLs
js/categories.js           Category membership and filtering
js/radio.js                Stream URL validation and radio playback lifecycle
audio/                     Bundled MP3s and their attribution register
js/state.js                Catalog, defaults, input normalization
sw.js                      Versioned offline app-shell cache
manifest.webmanifest       PWA metadata
icons/                     Original SVG and PNG app icons
scripts/serve.js            Local static server
scripts/generate-icons.py   Reproducible PNG icon generator
tests/                     State and audio generation tests
docs/                      Research, architecture, and project plans
.github/workflows/ci.yml    Syntax and automated tests
```

## Checks

```sh
npm run check
npm test
```

See [testing notes](docs/testing.md) for browser and offline checks. No runtime or development dependencies are required for these commands.

## Installation and updates

The hosted app has separate browser storage from the localhost preview. Existing local mixes and imported recordings do not automatically transfer to the published site.

On browsers that offer the install event, an **Install app** button appears. Otherwise use the browser's install or Add to Home Screen menu where supported. Installation UI varies by browser. The service worker caches the app and bundled recordings; clearing site data removes this cache and saved mixes.

Increment the cache version in `sw.js` whenever shipping changed app files. A newly installed worker waits for existing app tabs to close before activating, so a session can keep its current version. An **Update app** button activates a downloaded update and reloads after pausing playback. When upgrading from 0.1.0, close all existing app tabs and reopen once to activate the first update.

## Known limits

- Lock-screen operation has passed user testing. Interruption recovery, extended background sessions, and continuous overnight playback still need validation.
- Browser support for custom audio codecs varies. Custom recordings loop as supplied; trim or crossfade them in an audio editor for a smoother seam.
- The engine limits decoded audio to 96 MiB and pauses with a message if a mix is too large. Six long imports may exceed this limit.
- Bundled loops are short (roughly 30 seconds). Thunder includes a 30-second quiet interval between events.
- Browser storage is local and may be cleared or evicted. Recipe export and cross-device sync are not included. Radio supports direct CORS-enabled HTTPS audio streams; playlists and station webpages are not supported.
- The sleep timer uses the audio clock for fading and the wall clock for stopping; device suspension can delay UI updates.

## AI usage disclosure

OpenAmbience has been developed with substantial assistance from OpenAI Codex. AI assistance has been used for product research, architecture and interface design, code and documentation, and writing and running automated checks. Project direction and feature decisions come from the maintainer. The repository includes AI-generated contributions; this disclosure does not imply that every contribution has received independent human review. Recorded checks and remaining validation limits are documented in [testing notes](docs/testing.md).

Bundled recordings come from the credited creators and retain their own licences; see [audio credits](audio/credits.json). Generated noise textures use procedural audio synthesis. The app does not require an AI service to run, and importing audio does not send it to an AI provider.

## License

[MIT](LICENSE) covers this project's code and original graphics. Bundled recordings retain their [individual CC0 or CC BY 4.0 licences](audio/credits.json). See [asset provenance](docs/assets.md).
