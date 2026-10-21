# Imports and device storage

Available in 0.8.0. Files stay in the current site's browser storage; these actions do not upload recordings.

Since 0.9.0, **My mixes → Download all mixes** backs up every saved mix in one ZIP, including shared recordings once. The same ZIP picker/drop flow opens a selective import preview for these backups. See [all-mix backups](mix-portability.md#all-saved-mixes-in-one-zip).

## Drop files or choose them

Drop one or several audio recordings anywhere in the app. A drop indicator appears, then **Add your sounds** opens with the filenames and a category selector. Choose **Add to library** to validate and store them. Dropping does not immediately add recordings or start playback. The existing file picker uses the same routing and validation. The selected category applies to the batch.

Drop one mix ZIP anywhere, or use the **Choose or drop a mix ZIP** area in **Import mix ZIP**, to open the restore preview. The picker shows the dropped filename. Choose **Load mix** when ready. There is no extraction step. ZIP detection uses the filename, MIME type, or standard ZIP signature. Audio is still validated by reading metadata and decoding, rather than trusting its name or MIME type. See [the portable mix format](mix-portability.md).

Folders, multiple ZIPs and batches mixing ZIPs with audio are rejected with an explanation. File drags are handled without navigating away; dragging ordinary text or links keeps normal browser behavior. Imports in progress cannot be replaced by another drop. Other open editing/storage dialogs ask you to close them before importing. The normal picker remains available on phones and browsers without desktop drag-and-drop.

Audio limits are unchanged: up to 30 stored custom recordings, 25 MiB per file, two minutes, mono/stereo, and a codec supported by the current browser. Content hashes detect identical recordings. Invalid files in an audio batch are reported individually; valid files can still import. ZIP restore validates its entire archive before committing audio and settings together.

## Manage recordings

Open **Manage storage** in the footer, or **Manage stored recordings** in Add sounds. The dialog shows:

- The total encoded size of uploaded recordings and the number of occupied recording slots.
- An optional browser estimate of this site's total usage and allowance, including cached app files and built-in audio. These are estimates rather than free disk space; another site on the same origin can share the allowance.
- Each recording's name, encoded file size, duration, category, whether the current mix uses it, and the names of saved mixes that select it.
- **Download** for an original recording's bytes, and **Remove** for the impact preview.

The list includes uploaded recordings only. Built-in sounds are managed by the existing whole-library offline cache. Station URLs have no stored recording bytes; their library-card Remove station button uses the same reference-aware removal flow. Refresh updates recording totals and the browser estimate for the current session. Reload to incorporate changes made in another tab.

## Remove with a reference preview

Remove recording in either the library or storage manager opens the same confirmation. It lists the current and saved mixes using that sound. When references exist, **Also remove this layer from the affected mixes** must be checked before removal is enabled. **Keep sound**, Escape, and Close cancel without changing data. Removing a sound in the current mix pauses playback; removing an unused recording leaves other playback running.

The removal deletes the sound and its references in one IndexedDB transaction. Other layers, levels, mix names and timer settings are preserved. A mix can become empty when its only layer is explicitly removed; it stays in My mixes for editing or deletion. The original file cannot be recovered from browser storage after successful removal, so download it or export a mix ZIP first if needed.

The transaction rechecks stored settings, references and recording identity against the preview. Changes in another tab require a reload and fresh review, rather than overwriting unseen data. A synchronous or asynchronous write failure rolls back both the sound deletion and recipe updates. Playback may already have paused, but failed removal keeps the recording and saved recipes. Missing-file relinking and bulk cleanup remain future work.

## Retention protection

Where supported, **Keep offline data** requests persistent storage through the browser's Storage API. The dialog reports whether protection is enabled, declined or unavailable. A denied request leaves existing data alone. Protection reduces automatic eviction risk; clearing site data can still remove recordings, mixes and caches. ZIP downloads remain your independent backups. The request happens only when the button is pressed.

The implementation feature-detects these APIs; missing estimates or persistence controls do not prevent viewing, downloading or removing recordings. See [MDN's Storage API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API) for estimates and retention, and [file-drop access](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files) for the drop event's file-list behavior.
