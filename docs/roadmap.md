# Roadmap

## 0.1 — Working foundation

- [x] Public-surface Ambiphone analysis with sources and evidence limits.
- [x] Static HTML/CSS/JavaScript app with original visual identity.
- [x] Six procedural sound layers, master transport, and volume controls.
- [x] Search, presets, local named mixes, and a sleep timer.
- [x] PWA manifest, icons, service worker, unit tests, and CI definition.

## Next — Saved mixes and custom sounds

The current priority is the [saved mixes and custom sound proposal](saved-mixes-and-custom-sounds.md). This is a scoped plan; implementation has not started.

- [x] Inventory all 67 reference channels and check 60 original-source license pages.
- [x] Identify an openly licensed starter-pack shortlist and alternatives.
- [x] Define stable sound identities, local-file imports, and saved-mix portability.
- [ ] Select and audition originals, prepare loops/events, and publish a versioned catalog with credits.
- [ ] Extend mixes with rename, update, duplicate, and recipe export/import.
- [ ] Store imported audio and mixes in IndexedDB, including migration from 0.1.0.
- [ ] Add file-picker/batch imports, duplicate detection, and missing-sound recovery.
- [ ] Verify storage failure recovery and offline restart on real Android/iOS devices.

## Quality and portability

- [ ] Listen for clicks, repeated patterns, and abrupt transitions over long sessions.
- [ ] Improve pink-noise spectrum and nature texture quality.
- [ ] Test installed iOS/Safari and Android playback, audio interruptions, and locked screens.
- [ ] Add Media Session controls and reflect OS-driven audio state changes in the UI.
- [ ] Add export/import, active-only filtering, and an explicit PWA update action.
- [ ] Run screen-reader and zoom audits on desktop and mobile.

## Later — Open sound library

- [ ] Record or obtain compatible field recordings and maintain an attribution register.
- [ ] Add documented loop preparation, lazy decoding, and per-sound offline downloads.
- [ ] Add versioned mix URLs and stereo placement.
- [ ] Evaluate stream support separately from the offline catalog.

Repository publication and deployment are operational steps, not proof that these product milestones have been validated.
