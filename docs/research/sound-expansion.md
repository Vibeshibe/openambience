# Sound expansion feasibility

Initial feasibility review: 2026-10-05. The shortlist below records the research stage. Implementation is now available on `dev` in 0.5.0-alpha.1: three new recording loops, the Morning birds rename, and adjustable binaural generation. Direct acquisition and licence checks succeeded for all three sources; see [asset preparation](../assets.md#050-alpha1-additions) and [validation](../testing.md). Human listening remains pending.

## Recording candidates

| Requested sound | Candidate | Source-page licence | Proposed treatment |
| --- | --- | --- | --- |
| Rain on tarp / tent | [Rain on tent — Breviceps](https://freesound.org/people/Breviceps/sounds/484723/) | CC0 1.0 | 86.55 seconds, stereo, recorded on a mobile phone. A direct match for tent rain; audition for handling noise and select a consistent passage. Label **Rain on tent**, since the source does not establish a separate tarp recording. |
| Morning birds | [dawn chorus.wav — squashy555](https://freesound.org/people/squashy555/sounds/269244/) | CC0 1.0 | Already bundled as **Birdsong**, ID `birds`. The source describes a UK April recording before sunrise. Rename the display label to **Morning birds** while retaining the ID and existing audio, preserving saved mixes. |
| Evening birds | [Evening Birdsong.wav — Benboncan](https://freesound.org/people/Benboncan/sounds/116667/) | CC BY 4.0 | 6:51.134 stereo spring birdsong just before dusk. Suitable subject matter for a distinct **Evening birds** card; audition for an unobtrusive loop. The primary-page search result supplied its description and licence; direct retrieval returned 403, so recheck when acquiring. |
| Riding in a train carriage | [Train interior ambiance — VlatkoBlazek](https://freesound.org/people/VlatkoBlazek/sounds/322885/) | CC BY 4.0 | 2:03.5 stereo recording inside a carriage with the window closed. Audition for steady running sections without announcements, clear speech, or abrupt stops. Preserve the creator's requested attribution information from the source page in the credits. |

These candidates fit the existing CC0 / CC BY 4.0 recording policy. [CC0](https://creativecommons.org/publicdomain/zero/1.0/) permits copying and adaptation; [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) also requires appropriate credit, the licence link, and identification of modifications. Preserve source-page attribution notices during acquisition. Original Freesound downloads require login; the current pack uses creator-published MP3 previews. Availability of suitable new preview/original downloads still needs checking.

An alternative [Morning Birdsong recording by Benboncan](https://freesound.org/people/Benboncan/sounds/95015/) is described as mono and windy. Reusing our existing stereo dawn recording avoids adding a near-duplicate until listening establishes a reason to replace it.

## Binaural beats

Feasible with a new generated layer in the current Web Audio engine. Generate two sine tones and route them to separate left/right channels with a two-input `ChannelMergerNode`. For example, 200 Hz on the left and 206 Hz on the right provide a 6 Hz frequency difference. Use stereo headphones to deliver the separate signals to each ear. Describe the actual frequency difference in the interface, with a headphones hint.

The relevant primitives are documented by the [Web Audio specification](https://www.w3.org/TR/webaudio/#ChannelMergerNode), [OscillatorNode reference](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode), and [ChannelMergerNode reference](https://developer.mozilla.org/en-US/docs/Web/API/ChannelMergerNode). This is an implementation proposal; no binaural layer has been rendered or listening-tested yet.

`AudioEngine.bufferFor()` currently produces mono procedural buffers, so adding a catalogue entry alone would not produce binaural audio. Add a dedicated oscillator branch in `AudioEngine.update()`, route it through the existing layer gain and master/timer controls, and register both oscillators and the merger for cleanup. Keep left/right separation through the master path. Original generation needs no recording download and adds negligible offline asset size. Fixed frequency presets can use stable sound IDs; adjustable parameters would also need saved-mix normalization and persistence support.

## Proposed implementation order

1. Audition and prepare tent rain, evening birds, and train carriage loops. Rename the existing dawn recording's display label while preserving `birds`.
2. Register new recordings, attribution, checksums, and modifications in `audio/credits.json`; regenerate `js/catalog.js`. Assign rain to Weather, birds to Wildlife, and train carriage to Indoors initially; the category mapping currently uses explicit IDs.
3. Add a generated binaural layer with verified left/right frequencies, level ramps, pause/resume, removal, and sleep-timer behavior. Choose fixed presets or an adjustable control before finalizing persistence.
4. Bump the offline cache and test saved mixes, offline playback, category counts, and extended listening on headphones.

At the existing 128 kbit/s encoding, three new 30-second loops would add approximately 1.44 MB before small container overheads. Longer bird/train loops may be preferable if short repetitions are noticeable. The actual file sizes and loop quality remain unmeasured.
