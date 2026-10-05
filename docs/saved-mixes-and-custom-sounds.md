# Proposed scope: saved mixes and custom sounds

> Implementation status (0.5.1): local imports, duplicate detection, removal, and saved-mix create/load/update/rename/duplicate/delete are available. Recipes remain in versioned localStorage; imported audio uses IndexedDB. ZIP mix export/import, missing-asset relinking, drag-and-drop, and storage-management UI below remain proposals.

Date: 2026-09-30. **Design proposal only; none of the new behavior below is implemented by this research change.** The immediate product focus is reusable personal mixes, an openly licensed sound catalog, and simple local-file imports. Inventory and source selection are in [research](research/ambiphone-sound-inventory.md).

Export plan updated 2026-10-05: the first export/import feature should use one ZIP containing mix JSON and its custom recordings, restoring both in one operation.

## Current baseline and intended next step

The 0.1.0 starter supports six generated sound layers and up to 20 named mixes in localStorage, with load/delete actions. It has no recorded sound library, sound imports, mix renaming/updating/duplication, or portable mix export. The next implementation should extend that model rather than require accounts or a backend.

| Included in the proposed next phase | Deferred |
| --- | --- |
| Save, rename, update, duplicate, load, and delete a mix | Accounts, cloud sync, and a public community library |
| Independent sound levels and master volume | Spatial effects and advanced sound editing |
| Add one or several local audio files using a file picker | Microphone recording, URL imports, and remote streaming |
| Persist custom sounds and mix references offline | Automatic publishing of user imports |
| Simple looping; optional event interval for intermittent effects | Radio playlists and exact Ambiphone mix-URL compatibility |
| Export/import one ZIP with mix JSON and its custom recordings | Rendering a finished mix to WAV/MP3 |

## User flow

**Build a mix:** pick sounds, adjust their levels, and press Save mix. Show a name field and a clear saved/unsaved state. Loading a mix restores its layers and settings without unexpectedly starting audio. For the first version, pause before switching mixes; decide separately whether seamless switching is worth adding.

**Edit a mix:** distinguish Save changes from Save as new. Renaming changes the display label, not the mix ID. Duplicating creates a new mix ID with the same settings. Deleting a mix does not delete its sounds. Remove the starter's arbitrary 20-mix limit when moving to the new store, using actual storage constraints instead.

**Export and import a mix:** Export downloads one ZIP containing the mix settings and all custom recordings it uses. Import accepts that same ZIP and restores the mix and recordings together, without manual extraction or separate audio-file selection. Show the restored mix ready to play, without starting playback automatically.

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

**Single ZIP (first phase):** the normal export is a ZIP containing versioned mix JSON and every custom audio file referenced by that mix. Preserve the mix name, enabled layers, layer levels, master volume, timer and binaural settings, and custom sound names and categories. Include content hashes and available attribution metadata. JSON is part of the archive; users do not need to manage it separately. Unrelated recordings elsewhere in the user's library are not included.

**Restore together:** selecting the ZIP validates its contents, then restores the mix and custom recordings as one operation. Reuse identical audio by content hash and remap imported sound IDs to local IDs; preserve existing mixes and recording metadata. Repeated imports must not create duplicate audio blobs. A fresh browser with OpenAmbience available should not ask the user to locate the original custom files.

**Built-in and online sources:** reference bundled sounds by stable ID and preserve generated-sound parameters, without copying the built-in library into every ZIP. Include radio station names and URLs, not recordings of their streams; radio still needs internet. Report unsupported built-in IDs or invalid station URLs explicitly instead of silently dropping layers. Exports remain local file downloads.

**Incomplete or invalid archives:** validate the format version, archive paths, file count, total expanded size, audio limits, and content hashes before saving. A missing recording or a quota failure must not produce a partially restored mix or overwrite existing data. Explain the problem and leave the existing library intact. A successfully exported ZIP must contain all of its referenced custom audio; missing-sound recovery is an exceptional repair path.

**Migration:** read the existing `openambience.v1` key, convert the six known procedural IDs through an explicit mapping, copy current and saved mixes to IndexedDB, verify the transaction, and retain the legacy value until migration is confirmed. Detect repeat migrations. Keep a recoverable record of unknown/missing IDs instead of discarding whole mixes.

## Acceptance checks for future implementation

1. Save a mix with two built-in sounds and one imported file; restart offline and restore all three with the same settings.
2. Rename both the mix and custom sound; references remain intact.
3. Import identical bytes twice, and different bytes with the same filename; distinguish deduplication from naming.
4. Import a batch containing valid, corrupt, and unsupported files; report individual outcomes accurately.
5. Simulate quota failure; no half-created sound or falsely successful save remains.
6. Delete an in-use custom sound; show impacted mixes and preserve recoverable missing references.
7. Export a mix with built-in sounds and custom recordings as one ZIP, then import it in a fresh browser; restore its settings and custom audio without extracting files or locating originals. Confirm playback offline once the app and bundled library are cached.
8. Update the service worker/app version; custom sounds and mixes survive.
9. Migrate 0.1.0 data twice; preserve settings and avoid duplicates or autoplay.
10. Test installed Android and iOS apps in airplane mode, after restart, after interruptions, and with a locked screen; record actual behavior.
11. Import the same ZIP twice and import one whose sound IDs conflict with local IDs; reuse matching audio by hash without overwriting existing mixes or sound metadata.
12. Reject corrupt, incomplete, oversized, unsafe-path, or unsupported-version ZIPs; simulate storage failure and verify that no partial import or loss of existing data remains.
13. Round-trip binaural settings and radio station metadata; make the radio's internet requirement clear and do not autoplay after import.
