# Ambiphone product analysis

Research date: 2026-09-30. Purpose: establish a useful starting point for an independent, open-source ambient sound mixer.

## Evidence and limits

This is a public-surface review, not an audit of Ambiphone's source code. The user describes it as closed source; this review did not establish a published source license. Evidence comes from indexed public interface text, the fetched HTML shell and manifest, installation instructions, and credits. Indexed pages can lag the live app. The indexed footer reports version 1.15.0; that is not a verified live release number.

No interactive playback, sound quality, saved-state persistence, background playback, timer behavior, or offline behavior was tested in Ambiphone. Public metadata confirms PWA configuration, not successful installation on every platform. Observations below are deliberately separated from proposals.

## Product and interaction model

Ambiphone presents a browser-based environment for combining ambient audio. Its core appeal is a short path from choosing sounds to having a personally useful background. The indexed interface has search, categorized sound controls with explicit on/off labels, and a section for saving mixes. These suggest three primary user journeys: discover a layer, build an environment, and return to it later. The public installation page provides a path from website to installed app. [S1–S3]

The catalog snapshot contains 67 entries across eight groups: Nature, Music, People + Places, Sci-Fi + Fantasy, Live Police Radio, Signals, Binaural Beats, and Noise. This breadth supports both everyday backgrounds and imaginative scenes. It also introduces discovery and maintenance costs: searching becomes useful, live sources have different availability characteristics, and recordings need individually tracked attribution. The credits page identifies multiple creators and varying licenses, including CC0 and CC BY. [S1, S4]

## Feature evidence matrix

| Area | Evidence available | Implication for OpenAmbience |
| --- | --- | --- |
| Sound discovery | Indexed search field, result count, and category headings | Start with a searchable small catalog; introduce categories when needed |
| Layer selection | Public controls carry sound names and on/off labels | Use native buttons with explicit pressed states |
| Reusable mixes | Indexed saved-mix section and save affordance | Store named mixes locally without requiring accounts |
| Mix URLs | Indexed links carry an `m` query parameter | Investigate sharing separately; its format and restoration behavior are unverified |
| Installability | Installation guide and public web manifest | Include a manifest, icons, HTTPS deployment, and offline app shell |
| Audio diversity | Catalog includes recorded ambience, noise, music, and live sources | Model recordings and streams separately when added |
| Attribution | Public credits associate sounds with creators and licenses | Keep an asset provenance register |
| Volume, transport, timer | Not established by the retrieved interface text | Implement basic controls as our own requirements; do not claim verified parity |
| Offline/background audio | Not tested | Test explicitly before making platform guarantees |
| Account/analytics behavior | No network or storage audit performed | Our starter should have no account dependency or analytics |

Sources: [S1–S4]. A visible affordance confirms its presence, not its complete behavior.

## Technical observations

The directly fetched HTML is a client-rendered shell with a module script and stylesheet. That supports a client-side application inference, but does not establish a framework, backend, audio engine, hosting stack, or caching strategy. The viewport metadata includes `maximum-scale=1.0` and `user-scalable=no`; this is a potential zoom-accessibility concern, not a measured accessibility failure. OpenAmbience permits browser zoom. [S5]

The manifest declares standalone display, root scope, a `/pwa` start URL, and PNG icons at 192 and 512 pixels with ordinary and maskable variants. App-install metadata includes Apple touch assets. These are concrete PWA packaging choices; neither the manifest nor the install guide establishes offline sound availability. [S3, S5, S6]

## Product assessment (interpretation)

The strongest design lesson is to make mixing the primary activity. Discovery, balancing, and returning to a mix should be immediately understandable. A wide catalog is attractive, but an open project benefits from a smaller set that is dependable and easy to extend. Saved environments provide a reason to return without adding a service or account system.

Potential friction worth evaluating in a future interactive review includes finding active sounds in a long catalog, understanding which layers require a connection, accidental loss of saved mixes, loop seams over long sessions, and phone interruptions. These are evaluation questions, not confirmed defects in Ambiphone.

## OpenAmbience implementation priorities

1. **Starter, implemented:** six procedural layers; independent volumes; master play/pause and volume; search; three presets; named local mixes; timer with a five-second fade; responsive keyboard-accessible UI; cached shell and locally generated audio.
2. **Next:** audition and improve texture quality; test Safari/iOS and Android; expose active-only filtering; export/import local mixes; provide an update notification for cached versions.
3. **Later:** add openly licensed field recordings with documented sources, loop preparation and explicit offline downloads; versioned share links; Media Session controls; optional stereo placement.
4. **Deferred:** streamed music/radio, accounts, synchronization, and binaural-beat content. Each needs additional UX, provenance, or infrastructure work.

The starter's rain, ocean, and wind are synthesized impressions. They do not reproduce Ambiphone's recordings or represent catalog parity. Pink noise is an approximation, not a calibrated noise spectrum.

## Proposed acceptance criteria

- A visitor can select two or more sounds and change each level independently.
- Reload restores selection and volumes, while playback still requires a user gesture.
- Pause retains the mix; reset clears the current selection without deleting saved mixes.
- A named mix can be saved, loaded, and deleted; invalid local data does not break startup.
- After a successful online cache installation, the shell and all starter sounds work offline.
- Keyboard users can operate all controls, see focus, and identify toggled layers.
- A timer fades and pauses playback; mobile suspension limitations are documented and tested separately.
- Every distributed asset has a traceable origin and license.

## Sources

- **S1:** [Ambiphone indexed catalog](https://ambiph.one/?m=1-Ambient+Vacuum-bf100bp50), retrieved through web search on the research date.
- **S2:** [Ambiphone indexed saved-mix interface](https://ambiph.one/?m=1-Ambient+radio-bf100), retrieved through web search on the research date. Parameter semantics were not reverse engineered.
- **S3:** [Ambiphone installation instructions](https://ambiph.one/app).
- **S4:** [Ambiphone acknowledgements](https://ambiph.one/acknowledgements).
- **S5:** [Ambiphone HTML shell](https://ambiph.one/), fetched directly on the research date.
- **S6:** [Ambiphone public web manifest](https://ambiph.one/manifest.webmanifest), fetched directly on the research date.

All interpretation and implementation recommendations are original. No Ambiphone source code, graphics, or recordings are distributed in this repository. This project is independent and is not endorsed by Ambiphone or its creator.
