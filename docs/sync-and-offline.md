# Custom sounds, sync, and offline playback

## Current storage

- Imported recordings: the `sounds` object store in the `openambience` IndexedDB database, including the original file blob, stable ID, content hash, name, and category.
- Radio entries: station name, stable ID, and HTTPS URL in the same IndexedDB store. Live audio is not downloaded or cached.
- Current and named mixes: `openambience.v2` in localStorage; recipes refer to stable sound IDs.
- Built-in audio and app files: a versioned service-worker cache.

This storage belongs to the site's origin and browser profile on that device. Using a different browser or host/port does not share that data. No audio or mix is currently uploaded. Radio playback connects directly to the selected station.

Browser-managed storage can be cleared by the user or evicted under storage pressure. Persistence can be requested with the Storage API but is not a backup or a guarantee that the user cannot delete data. See [MDN: storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## Proposed sync architecture

Sync is compatible with offline use if each device retains playable local copies. Keep IndexedDB as the playback source and add an optional remote replica:

1. Import and play locally immediately. Queue metadata and audio uploads while offline.
2. When connected, sync authenticated metadata, mix recipes, and audio objects. Use the existing content hashes to avoid sending unchanged recordings twice.
3. Other devices receive metadata first and download audio in the foreground. Clearly distinguish available offline, downloading, and download-needed states.
4. Commit verified downloads to IndexedDB before marking them available offline. A mix can play fully offline only when all of its non-radio sounds have downloaded.
5. Preserve stable IDs across devices. Record revisions and deletion markers; keep conflicting mix edits as separate recoverable copies. A missing local asset should remain referenced, with an explicit missing/download-needed state.
6. Keep local playback independent of login sessions and server availability. Let users retain or remove downloaded files explicitly; remote deletion should have clear, recoverable semantics.

The present normalizer removes unknown sound IDs, which is fine for the current local-only catalog but must change before metadata-first sync ships. Synced recipes must preserve unresolved references until downloads complete. Storage quota failures must leave both the remote copy and the saved recipe intact.

An implementation also needs a chosen sync provider, authentication, private object storage, upload/download limits, conflict rules, and privacy/retention controls. Foreground sync on app open is the portable baseline; background sync should only be an enhancement. No sync service, account system, or uploads have been added in this iteration.

Radio URLs can sync as metadata in a future version, but live stations will still require an internet connection. Syncing a URL cannot make live broadcasts playable offline.
