# OpenAmbience

A little room to breathe. An open-source ambient sound mixer for focus, relaxation, and rest.

[Open the app](https://vibeshibe.github.io/openambience/) · [GitHub repository](https://github.com/Vibeshibe/openambience)

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

## Available in 0.3.0-alpha.7

- Twelve recorded sounds: rain, rain on glass, thunder, forest wind, waves, stream, fireplace, birds, crickets, café, fan, and cat purring.
- Six generated textures, including white, pink, and brown noise. Earlier saved mixes keep their original procedural sounds.
- A phone-friendly two-column library, search, a collapsible Filters panel with multi-select category checkboxes, counts, and a visible active-filter summary, grouped browsing, and a compact player with a mixer panel. Uploaded recordings appear beside built-in sounds in their assigned category, with a small **Uploaded** tag.
- **＋ Radio** saves direct HTTPS radio-stream URLs locally. Compatible stations join the mixer and sleep timer; live playback needs internet and is never cached. See [radio compatibility](docs/internet-radio.md).
- Up to six simultaneous layers, individual volume, and a sleep timer with a five-second fade. The persistent player has a large play/pause button, an always-visible master-volume slider, and mute/unmute. The three-dot **Mix options** button opens saving and timer controls.
- Twenty named local mixes with load, update, rename, duplicate, and delete controls.
- Choose files and a category in **Add sounds**, then select **Add to library**. A batch shares the chosen category; you can change each recording’s category afterward. **My sounds** still finds every imported recording. Supported formats depend on the browser; MP3 and WAV are good starting points. Files must be mono/stereo, at most 25 MB and two minutes long. Up to 30 imports; identical files are detected.
- Offline caching of the app and the entire bundled library. Wait for **Library ready offline** before disconnecting. Imports are stored locally in IndexedDB; mix recipes use localStorage.
- In-app sound credits, install support, and an update button for future versions.

Recordings are edited, loudness-adjusted excerpts of creator-published MP3 previews under CC0 or CC BY 4.0, acquired directly from Freesound. They are not lossless originals. Attribution, source URLs, modifications, and checksums are in [audio/credits.json](audio/credits.json). Audio assets have separate licences from the MIT application code.

Nothing is uploaded when you import a recording. Clearing browser site data removes custom sounds and saved mixes. Browsers can also evict local storage. Back up original recordings separately; mix export/import remains planned. Pausing cancels the current timer; resuming starts its selected duration again. Playback never starts automatically after reload.

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

## Deployment and installation

The public app is hosted at **https://vibeshibe.github.io/openambience/**. GitHub Pages publishes from **main → /(root)**; `.nojekyll` serves the static files without Jekyll processing. Future pushes to `main` publish updates, while `dev` remains the development branch. These settings are under **Settings → Pages → Deploy from a branch**. Relative URLs also support other HTTPS hosts at `/` or a project path such as `/openambience/`. The local server is for development.

The hosted app has separate browser storage from the localhost preview. Existing local mixes and imported recordings do not automatically transfer to the published site.

On browsers that offer the install event, an **Install app** button appears. Otherwise use the browser's install or Add to Home Screen menu where supported. Installation UI varies by browser. The service worker caches the app and bundled recordings; clearing site data removes this cache and saved mixes.

Increment the cache version in `sw.js` whenever shipping changed app files. A newly installed worker waits for existing app tabs to close before activating, so a session can keep its current version. An **Update app** button activates a downloaded update and reloads after pausing playback. When upgrading from 0.1.0, close all existing app tabs and reopen once to activate the first update.

## Known limits

- Background and lock-screen playback need real Android/iOS device validation; continuous overnight playback is not guaranteed.
- Browser support for custom audio codecs varies. Custom recordings loop as supplied; trim or crossfade them in an audio editor for a smoother seam.
- The engine limits decoded audio to 96 MiB and pauses with a message if a mix is too large. Six long imports may exceed this limit.
- Bundled loops are short (roughly 30 seconds). Thunder includes a 30-second quiet interval between events.
- Browser storage is local and may be cleared or evicted. Recipe export, cross-device sync and Media Session controls are not included. Radio supports direct CORS-enabled HTTPS audio streams; playlists and station webpages are not supported.
- The sleep timer uses the audio clock for fading and the wall clock for stopping; device suspension can delay UI updates.

## AI usage disclosure

OpenAmbience has been developed with substantial assistance from OpenAI Codex. AI assistance has been used for product research, architecture and interface design, code and documentation, and writing and running automated checks. Project direction and feature decisions come from the maintainer. The repository includes AI-generated contributions; this disclosure does not imply that every contribution has received independent human review. Recorded checks and remaining validation limits are documented in [testing notes](docs/testing.md).

Bundled recordings come from the credited creators and retain their own licences; see [audio credits](audio/credits.json). Generated noise textures use procedural audio synthesis. The app does not require an AI service to run, and importing audio does not send it to an AI provider.

## License

[MIT](LICENSE) covers this project's code and original graphics. Bundled recordings retain their [individual CC0 or CC BY 4.0 licences](audio/credits.json). See [asset provenance](docs/assets.md).
