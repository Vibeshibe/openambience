# Changelog

App releases use [Semantic Versioning](docs/versioning.md). Research checkpoints on `dev` may precede the next release.

## 0.2.0-alpha.1 — 2026-09-30

Development preview on `dev`.

- Added twelve independently sourced CC0/CC BY recordings with edited loops, complete attribution, and offline caching.
- Reworked the mobile library with category filters, two-column cards, a compact player, and a mixer sheet.
- Added local multi-file audio imports in IndexedDB, duplicate detection, size/duration limits, and removal.
- Added saved-mix update, rename, and duplicate controls; retained existing mixes and procedural sound IDs.
- Added a six-layer limit, decoded-memory budget, and explicit update control.

### Research and project setup

- Established the `dev` branch and documented versioning, release tags, and regular checkpoint pushes.
- Inventoried 67 Ambiphone channels and independently checked the license labels on 60 directly credited sound-source pages; added Markdown, CSV, and JSON research artifacts.
- Proposed a 12-sound starter pack, five alternative sources, and acquisition/attribution steps; flagged noncommercial content, license discrepancies, and unresolved provenance.
- Documented the next feature scope around saved mixes and local custom-sound imports, including offline storage, migration, missing assets, and recipe portability. The research checkpoint preceded this implementation.

## 0.1.0 — 2026-09-30

- Initial static PWA starter with six procedural sound layers, local mixes, and a sleep timer.
- Ambiphone public-surface analysis, architecture, asset provenance, and roadmap.
- Offline app shell, original icons, automated tests, and CI configuration.
