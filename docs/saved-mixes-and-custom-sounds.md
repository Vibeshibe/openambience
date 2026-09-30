# Proposed scope: saved mixes and custom sounds

Date: 2026-09-30. **Design proposal only; none of the new behavior below is implemented by this research change.** The immediate product focus is reusable personal mixes, an openly licensed sound catalog, and simple local-file imports. Inventory and source selection are in [research](research/ambiphone-sound-inventory.md).

## Current baseline and intended next step

The 0.1.0 starter supports six generated sound layers and up to 20 named mixes in localStorage, with load/delete actions. It has no recorded sound library, sound imports, mix renaming/updating/duplication, or portable mix export. The next implementation should extend that model rather than require accounts or a backend.

| Included in the proposed next phase | Deferred |
| --- | --- |
| Save, rename, update, duplicate, load, and delete a mix | Accounts, cloud sync, and a public community library |
| Independent sound levels and master volume | Spatial effects and advanced sound editing |
| Add one or several local audio files using a file picker | Microphone recording, URL imports, and remote streaming |
| Persist custom sounds and mix references offline | Automatic publishing of user imports |
| Simple looping; optional event interval for intermittent effects | Radio playlists and exact Ambiphone mix-URL compatibility |
| Export/import a mix recipe; clear missing-sound handling | Portable audio bundles until the local import path is reliable |

## User flow

**Build a mix:** pick sounds, adjust their levels, and press Save mix. Show a name field and a clear saved/unsaved state. Loading a mix restores its layers and settings without unexpectedly starting audio. For the first version, pause before switching mixes; decide separately whether seamless switching is worth adding.

**Edit a mix:** distinguish Save changes from Save as new. Renaming changes the display label, not the mix ID. Duplicating creates a new mix ID with the same settings. Deleting a mix does not delete its sounds. Remove the starter's arbitrary 20-mix limit when moving to the new store, using actual storage constraints instead.

**Add a sound:** Add sound opens the standard device file picker; support selecting multiple files and desktop drag-and-drop. Derive the default name from the filename. After validating and storing a file, show it in My sounds and make it available to any mix. Custom imports stay on the device. Optional creator/source/license fields should not block a private import.

Default to looping, with an optional Play occasionally setting for an owl, thunder, or other discrete effect. Initially expose only a sensible interval range, avoiding a full audio editor. A sound can be renamed without changing existing mixes. A content checksum detects importing the same file twice; different bytes sharing a filename remain distinct.

**Remove a sound:** show how many saved mixes reference it. Offer to keep it, replace those references, or remove the file while preserving clearly marked missing layers. Do not silently delete or substitute mix layers.

Use the broadly supported [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications) for picker/drop access. Treat MP3 and PCM WAV as initial test targets; AAC/M4A, FLAC, Ogg, and other formats should be accepted only when the current browser can actually decode them. An `audio/*` picker filter alone does not validate a file. Report unsupported or corrupt files by name, without losing successful imports.

## Identity and storage model

Use stable identifiers rather than filenames, display names, or temporary `blob:` URLs. Suggested forms are `builtin:rain-leaves-v1`, `generated:brown-v1`, and `custom:<uuid>`. A sound's content hash and immutable asset version distinguish changed recordings from renamed labels. Saved mixes must not silently acquire a different recording after a catalog update.

Store mix records, sound metadata, and custom audio blobs in **IndexedDB**. It supports structured records and files/blobs through transactions; localStorage is unsuitable for large audio payloads. Keep the service worker's app-shell cache separate from user audio storage. [IndexedDB documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

| Record | Proposed fields |
| --- | --- |
| Sound metadata | `id`, `name`, `origin` (built-in/generated/custom), `assetVersion`, `contentHash`, `mimeType`, `byteLength`, `durationSeconds`, `playbackDefaults`, `license`, `sourceUrl`, `creator`, `createdAt` |
| Audio asset | `contentHash`, `blob`, `verifiedAt`; generated sources have generator/version/parameters instead of a blob |
| Mix | `id`, `schemaVersion`, `name`, `masterVolume`, `layers`, `createdAt`, `updatedAt` |
| Mix layer | `soundId`, `assetVersion`, `enabled`, `volume`, `mode`; event layers also carry `intervalMinSeconds` and `intervalMaxSeconds` |

Treat `schemaVersion` as the saved-data contract, separately from the app's [SemVer version](versioning.md). Persist edits transactionally. Pause playback and cancel pending events when switching/resetting a mix. Do not save live playback position or autoplay intent in a recipe.

## Illustrative recipe

This is a proposed format, not a working import endpoint. The custom ID is an example placeholder, not a real sound in the repository. Hashes belong to associated asset metadata and would be supplied in a portable export manifest.

```json
{
  "schemaVersion": 1,
  "id": "mix-example-reading",
  "name": "Reading by the window",
  "masterVolume": 0.4,
  "layers": [
    {
      "soundId": "builtin:rain-leaves-v1",
      "assetVersion": 1,
      "enabled": true,
      "volume": 0.5,
      "mode": "loop"
    },
    {
      "soundId": "custom:example-wind-chime",
      "assetVersion": 1,
      "enabled": true,
      "volume": 0.2,
      "mode": "event",
      "intervalMinSeconds": 30,
      "intervalMaxSeconds": 90
    }
  ]
}
```

Volumes in this proposed schema are finite values in `[0, 1]`. The current starter uses `[0, 100]`, so migration must explicitly convert them. Validate IDs, modes, counts, interval bounds, finite numbers, and supported schema versions before committing imported data. Newer unsupported schemas produce a useful error rather than guessed defaults.

## Offline storage and memory

Import a **copy** of the selected file, not just its original path or a file handle. It should still play after restarting the installed PWA or moving the original file. Mark a sound available offline only after the blob transaction succeeds. Built-in downloadable packs need the same explicit readiness check. Use storage estimates to display usage and handle quota errors without partial records.

Offer a persistent-storage request, while accurately showing whether it was granted. Browser storage is not a backup: provide export instructions and never silently evict custom sounds to make room for a pack. [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/)

Decode only needed layers, release unused buffers, and impose a documented duration/decoded-memory limit on imports. As an initial planning ceiling, evaluate 25 MB encoded and 120 seconds per custom file, with a separate active-buffer budget; validate these limits on real devices before fixing the product policy. Large recordings may need a streaming media-element path in a later phase. Screen-off playback is a separate Android/iOS validation requirement.

## Export, portability, and recovery

**Recipe export (first phase):** small JSON file with layer settings and asset identities. This does not carry audio. On another device, match built-in IDs and custom content hashes; list unresolved custom sounds and allow the user to select their files. Never claim a recipe is fully portable just because its JSON imported successfully.

**Portable bundle (later):** an archive with recipe JSON, selected audio, content hashes, and an attribution manifest. Make inclusion of audio explicit. A private import does not prove permission to redistribute it. Built-in CC BY assets must retain credits; unverified custom rights should be clearly distinguished. Do not upload bundles automatically.

**Migration:** read the existing `openambience.v1` key, convert the six known procedural IDs through an explicit mapping, copy current and saved mixes to IndexedDB, verify the transaction, and retain the legacy value until migration is confirmed. Detect repeat migrations. Keep a recoverable record of unknown/missing IDs instead of discarding whole mixes.

## Acceptance checks for future implementation

1. Save a mix with two built-in sounds and one imported file; restart offline and restore all three with the same settings.
2. Rename both the mix and custom sound; references remain intact.
3. Import identical bytes twice, and different bytes with the same filename; distinguish deduplication from naming.
4. Import a batch containing valid, corrupt, and unsupported files; report individual outcomes accurately.
5. Simulate quota failure; no half-created sound or falsely successful save remains.
6. Delete an in-use custom sound; show impacted mixes and preserve recoverable missing references.
7. Export a recipe and import it on another device; explicitly request missing custom audio and match it by hash.
8. Update the service worker/app version; custom sounds and mixes survive.
9. Migrate 0.1.0 data twice; preserve settings and avoid duplicates or autoplay.
10. Test installed Android and iOS apps in airplane mode, after restart, after interruptions, and with a locked screen; record actual behavior.
