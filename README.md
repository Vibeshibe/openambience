# OpenAmbience

A little room to breathe. An open-source ambient sound mixer for focus, relaxation, and rest.

[GitHub repository](https://github.com/Vibeshibe/openambience)

OpenAmbience is an independent project inspired by the experience of layering sounds in [Ambiphone](https://ambiph.one/). It includes a documented product analysis and a working static PWA starter, with original code, graphics, and procedurally generated audio. It is not affiliated with Ambiphone and does not redistribute its code or sound library.

## Run locally

Requires **Node.js 22 or newer**. No package installation, build step, API keys, or backend is required.

```sh
cd openambience
npm start
```

Open **http://localhost:8080**. Select some sounds or a preset, then press **Play mix**. Adjust each layer independently and use the master slider to set the overall level.

An alternative is `python3 -m http.server 8080 --bind 127.0.0.1` from this directory. Serve over HTTP locally or HTTPS when deployed; opening `index.html` through `file://` does not support modules and service workers reliably.

## Available in this starter

- Six layers: soft rain, ocean, wind, white noise, pink noise, and brown noise.
- Independent layer volumes, master volume, play/pause, and reset.
- Search, three starter presets, and up to 20 named local mixes.
- A 15-, 30-, or 60-minute sleep timer, with a five-second fade.
- Responsive layout, labeled controls, keyboard focus styles, and reduced-motion support.
- Manifest, app icons, and a service worker for offline use after the first successful online load.
- No accounts, analytics, third-party fonts, or audio downloads.

All audio is generated on the device. Nature sounds are synthesized textures, and pink noise is an approximation. This is a functional starting point, not a replacement for a professionally recorded sound library. Selection and saved mixes persist in this browser's local storage; playback never auto-starts after reload. A paused timer restarts for its selected duration when playback resumes.

## Research and design

- [Ambiphone analysis and source references](docs/research/ambiphone.md)
- [Architecture and implementation decisions](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Validation checklist](docs/testing.md)
- [Asset provenance](docs/assets.md)
- [Contribution guide](CONTRIBUTING.md)

## Project layout

```text
index.html                 Accessible application shell
styles.css                 Responsive interface
app.js                     UI, persistence, presets, timer, installation
js/audio.js                Web Audio synthesis and gain controls
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

Publish the static app files on an HTTPS host. Relative URLs support hosting at `/` or a project path such as `/openambience/`. For GitHub Pages, choose **Settings → Pages → Deploy from a branch → main → /(root)** after the repository has been pushed. The local server is for development.

On browsers that offer the install event, an **Install app** button appears. Otherwise use the browser's install or Add to Home Screen menu where supported. Installation UI varies by browser. The service worker caches all assets needed by the starter; clearing site data removes this cache and saved mixes.

Increment the cache version in `sw.js` whenever shipping changed app files. A newly installed worker waits for existing app tabs to close before activating, so a session can keep its current version. An in-app update prompt is planned.

## Known limits

- Background and lock-screen playback depend on browser/OS policies and need real-device validation. Continuous overnight playback is not guaranteed.
- The timer schedules gain changes on the audio clock and checks a wall-clock deadline. Device suspension can delay UI updates and playback suspension.
- Noise textures use short generated loops. Long listening sessions and spectrum accuracy need further review.
- Named mixes are local to one browser; exporting and sharing are planned.
- No recordings, streaming radio, account sync, or Media Session integration yet.

## License

[MIT](LICENSE), covering this project's code and original assets. Future third-party audio must carry separate provenance and compatible license information in [the asset register](docs/assets.md).
