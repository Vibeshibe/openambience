# Open audio sources and acquisition plan

Research date: **2026-09-30**. Status: **research and candidate selection only**. No audio has been downloaded, auditioned, edited, or added to the application.

## Finding

An openly reusable sound library is feasible. Much of Ambiphone's catalog points to originals on Freesound and Free Music Archive that already allow redistribution and adaptation. We can acquire those originals under their own licenses and prepare our own loops. We should not copy Ambiphone's hosted, edited versions.

The [inventory](ambiphone-sound-inventory.md) covers all 67 selectable channels. The [source register](ambiphone-sound-inventory.json) records the original-page license for all 60 directly credited recordings. The observed labels are 26 CC0, 29 CC BY 4.0, three CC BY 3.0, one CC BY-NC 4.0, and one Public Domain Mark. Two of the BY-labeled entries need additional license/attribution review, as documented below.

For audio, “openly licensed” is more precise than “open source.” A free download does not necessarily permit bundling the recording in a public repository or downloadable sound pack.

## Proposed license policy

| License/status | Treatment for distributed built-in sounds |
| --- | --- |
| CC0 1.0 | Preferred; retain provenance even when attribution is not required |
| CC BY 4.0 / 3.0 | Accept; include creator, title, source, exact license link, and modification notes |
| Public-domain claim | Accept only after checking the underlying source and status |
| CC BY-SA | Evaluate separately; not needed for the first pack |
| CC BY-NC, ND, unknown, or streaming permission only | Exclude from the proposed freely redistributable built-in pack |

[CC0](https://creativecommons.org/publicdomain/zero/1.0/) permits copying, modification, and distribution without requiring attribution. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) permits those uses with credit and other stated conditions; preserve the actual version, including [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) where applicable. [CC BY-NC](https://creativecommons.org/licenses/by-nc/4.0/) restricts commercial uses, making it unsuitable for our proposed unrestricted distribution policy. The [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) identifies a claimed status rather than granting a license.

The app code remains MIT. Imported and bundled audio retains its own license. These licenses do not automatically clear third-party music or broadcasts accidentally captured in a field recording.

## First-pack candidates

Start with these **12 sound types**, plus independently generated white, pink, and brown noise. This gives saved mixes useful variety without requiring the entire reference catalog. Selection is based on source descriptions and license metadata; listening approval is still pending. Durations and sizes below describe originals, not proposed shipping files.

| Sound | Original source / creator | License | Original duration / size | Preparation to evaluate |
| --- | --- | --- | --- | --- |
| Rain | [Rain on grass and leaves — SamsterBirdies](https://freesound.org/people/SamsterBirdies/sounds/584268/) | CC0 1.0 | 2:49.950 / 34.6 MB | CC0 alternative to the credited heavy rain; find a steady section |
| Rain on glass | [InspectorJ, #346642](https://freesound.org/people/InspectorJ/sounds/346642/) | CC BY 4.0 | 0:31.517 / 5.3 MB | Check repetition and preserve texture at the loop boundary |
| Thunder | [BlueDelta, #367702](https://freesound.org/people/BlueDelta/sounds/367702/) | CC0 1.0 | 1:00.208 / 30.4 MB | Four-channel recording; create a checked stereo event clip |
| Wind | [guillermochicasonido, #660464](https://freesound.org/people/guillermochicasonido/sounds/660464/) | CC BY 4.0 | 1:04 / 16.2 MB | Listen for low-frequency microphone buffeting |
| Ocean | [InspectorJ, #400632](https://freesound.org/people/InspectorJ/sounds/400632/) | CC BY 4.0 | 5:00.803 / 75.9 MB | Creator reports a helicopter near the end; select a clean section |
| Stream | [InspectorJ, #339324](https://freesound.org/people/InspectorJ/sounds/339324/) | CC BY 4.0 | 1:00.708 / 10.2 MB | Prepare a continuous water bed |
| Fire | [silencyo, #81800](https://freesound.org/people/silencyo/sounds/81800/) | CC0 1.0 | 0:51.029 / 9.3 MB | AIFF original; retain natural dynamics and check prominent pops |
| Birdsong | [squashy555, #269244](https://freesound.org/people/squashy555/sounds/269244/) | CC0 1.0 | 2:54.121 / 29.3 MB | Select a section without conspicuous repetition |
| Crickets | [ProductionNow, #196000](https://freesound.org/people/ProductionNow/sounds/196000/) | CC0 1.0 | 1:20.980 / 14.8 MB | Simpler provenance than Ambiphone's multi-source remix |
| Coffee shop | [waweee, #370973](https://freesound.org/people/waweee/sounds/370973/) | CC0 1.0 | 4:56 / 40.7 MB | Check intelligible speech and any background music |
| Fan | [InspectorJ, #403664](https://freesound.org/people/InspectorJ/sounds/403664/) | CC BY 4.0 | 1:00.150 / 15.2 MB | Establish a stable loop from the extractor-fan recording |
| Cat purring | [tosha73, #512223](https://freesound.org/people/tosha73/sounds/512223/) | CC0 1.0 | 0:41.413 / 5.7 MB | Listen for handling noise and uneven level |

Freesound's original downloads require a free account; its individual source pages show that requirement. Acquisition is a maintainer task. App users should receive packaged files from our host and should not need a Freesound account or API key. See the [Freesound FAQ](https://freesound.org/help/faq/) and each sound's source page.

## Alternatives and optional additions

| Use | Candidate | License and evidence | Decision |
| --- | --- | --- | --- |
| Heavy rain closer to the reference | [lebaston100, #243628](https://freesound.org/people/lebaston100/sounds/243628/) | CC BY 4.0; 2:37.337 WAV | Directly credited original; useful alternative to the CC0 rain |
| Ocean without attribution requirement | [Ocean Waves on a Tropical Beach — Jarrod stanley / J.D. Savanyu](https://commons.wikimedia.org/wiki/File:Ocean_Waves_on_a_Tropical_Beach.ogg) | Commons file page says CC0; 6:24, 16.83 MB Ogg | Alternate candidate; audition and confirm desired credit spelling at acquisition |
| Snoring | [SortsApostata, #233600](https://freesound.org/people/SortsApostata/sounds/233600/) | CC0; 0:34.500, 6.3 MB WAV | Replaces Piggimon's NC recording if requested; source description and channel metadata disagree on mono/stereo, so inspect the file |
| Keyboard | [SamsterBirdies, #489422](https://freesound.org/people/SamsterBirdies/sounds/489422/) | CC0; 1:40.182, 13.4 MB FLAC | Optional productivity pack |
| Vinyl texture | [mitchanary, #505173](https://freesound.org/people/mitchanary/sounds/505173/) | CC0; 2.992 seconds, 117.3 KB MP3 | Very short; evaluate repetition and codec-boundary behavior |
| Ambient music | [Realization — Kirk Osamayo](https://freemusicarchive.org/music/kirk-osamayo/season-one/ambient-realization/) | CC BY 4.0; 3:09 | Optional music pack; one of six verified BY-labeled FMA tracks in the inventory |
| Longer ambient music | [Almost in F — Kevin MacLeod](https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100394) | Creator's page provides CC BY 4.0 credits; 32:42 | Optional download, inappropriate for full-buffer decoding on memory-limited phones |

These five candidates outside Ambiphone's directly credited set—CC0 rain, CC0 crickets, CC0 ocean, CC0 snoring, and MacLeod's track—were checked on their linked source pages. They are not included in the 60-source reference-catalog count.

## Holds and exclusions

- **Piggimon snoring:** NC license; use the identified CC0 alternative.
- **Moulaythami cricket remix:** badge says BY 4.0, but the recording combines ten sources. Its BY-SA link concerns a photo. Collect the sound attribution chain if ever choosing this remix.
- **qubodup sci-fi laboratory:** BY 4.0 badge conflicts with BY 3.0 in the description. Hold until resolved; the creator also supplies contributor-credit requirements.
- **NOAA whale recording on Archive:** trace the original NOAA asset before relying on the uploader's public-domain marking.
- **Live police feeds and radio:** network service availability does not grant an offline redistribution license. Defer these channels.
- **Shipping forecast and air-traffic-control bank:** no reusable source established by the catalog metadata. Defer or make original replacements.
- **Noise, Morse code, bass rumble, and binaural tones:** generate independently if included. Ambiphone's audio files need not be reused. Binaural tones are outside the first-pack proposal.

## Acquisition and packaging steps

1. Obtain originals from their source pages after selecting candidates. Preserve title, uploader/creator, source URL, exact license, license URL, date, and required credits. Keep a local evidence snapshot.
2. Hash each downloaded original. Source-page hashes in the research register identify inspected metadata; they are **not** audio checksums.
3. Audition the full file for music, intelligible private speech, handling noise, abrupt peaks, and suitability. Check the actual channel count, sample rate, and duration.
4. Prepare original OpenAmbience edits: trim, downmix if necessary, remove DC offset, balance perceived level, and test loop transitions. Retain modification notes and both original/derived hashes.
5. Evaluate an MP3 or AAC delivery version for broad device support and loop behavior on the target devices. Keep archival masters outside the ordinary app payload. Codec and gapless behavior must be tested, not inferred from the extension.
6. Publish a versioned catalog entry with stable sound ID, playback mode, file URL, checksum, size, duration, gain recommendation, and attribution. Cache credits with the audio.
7. Mark an optional pack ready offline only after every required file is stored and verified. Updates to the app shell must preserve imported user files.

An illustrative budget: twelve 60-second files at 128–192 kbit/s total about **11.5–17.3 MB** before metadata and container overhead. This is a planning estimate, not an encoded result. At 48 kHz stereo float32, the same twelve fully decoded minutes occupy about **276 MB** (264 MiB), so download size alone is not a memory budget. Decode active layers lazily and release inactive buffers.

## Candidate saved mixes

These are original starting suggestions, not imported Ambiphone presets. Relative levels need listening tests.

| Name | Layers and proposed relative levels |
| --- | --- |
| Rainy reading | Glass rain 55%, fan 15% |
| Forest morning | Stream 45%, birds 25%, wind 10% |
| Fireside night | Fire 45%, crickets 15% |
| Coastal rest | Ocean 55%, wind 15% |
| Café focus | Coffee shop 35%, generated brown noise 20% |
| Distant storm | Rain 50%, thunder 15%, event interval 30–90 seconds |

Master volume remains independent. A saved mix records references and settings; downloading a sound pack and importing a custom sound are separate operations. See the [proposed feature scope](../saved-mixes-and-custom-sounds.md).
