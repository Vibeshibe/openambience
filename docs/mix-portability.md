# Share and back up mixes

Available on `dev` after 0.6.0. Open **Mix options → Share / download mix**, or use **Share** on a saved card. Give the mix a name, then copy its link or download its ZIP. These actions do not upload anything.

## Mix links

Links preserve selected built-in sounds, individual levels, master volume, binaural settings, and the selected sleep-timer duration. Radio station names and direct HTTPS stream URLs travel with the link. Radio still needs internet and the station's permission for browser playback.

The recipe is UTF-8 JSON encoded as base64url in `#mix=v1.<payload>`. The fragment stays out of HTTP requests to the app host. It is readable by anyone with the link; encoding is not encryption. The full link is limited to 16,000 characters. There is no link-shortening service or dependency on a backend.

Opening a link shows a preview. **Load mix** pauses the current playback and loads the selection without starting it. **Save on this device** is optional. Canceling the preview keeps the current mix. Links never carry local recordings; for those mixes, use **Download mix ZIP**.

## Single ZIP download and restore

A download is one ordinary `.openambience.zip` file containing:

- `mix.json`: the versioned recipe, name, active sound levels, master volume, timer duration, binaural settings, station names/URLs, and custom recording metadata.
- `audio/<sha256>.audio`: the original bytes of each custom recording referenced by the mix. Names, categories, original MIME types, content hashes and available source/credit fields are in the JSON.

Built-in audio is referenced by stable ID and comes from the installed app library. Unselected custom recordings are excluded. The ZIP is a portable recipe and its source recordings, rather than a rendered WAV or MP3 of the combined mix. Custom recordings retain their owners' rights; exporting does not grant permission to redistribute them.

In **My mixes**, choose **Import mix ZIP**, select the download, review the preview, and select **Load mix**. There is no extraction step or separate audio import. Saving adds a new named mix and preserves existing mixes. Uncheck **Save on this device** to load without adding another saved entry, including when the 20-mix limit is reached.

Identical custom files are reused by SHA-256; matching stations are reused by normalized stream URL. Imported IDs are remapped to new local UUIDs where needed. Existing recording and station names/categories are preserved when reused. Repeated imports can add new named mix entries but do not duplicate audio blobs. A different recording with the same filename remains a separate sound.

Before writing, import checks the format version, selected IDs, numeric settings, archive paths, entry count, compressed and expanded sizes, CRC-32, SHA-256, and browser audio decoding. Custom recordings must meet the existing 25 MiB, two-minute, mono/stereo limits. Archives allow up to seven files (JSON plus six recordings), 64 KiB of JSON and 151 MiB of expanded data; the library still allows 30 recordings and 20 stations. Unknown built-in IDs and missing files cause explicit errors instead of silently dropping layers. Unsupported versions require an app update.

The restored settings and all new recordings commit in a single IndexedDB transaction. Invalid audio, blocked/quota-limited storage or an aborted transaction leave the prior library and saved mixes intact. A successful restore is paused, with the timer ready to begin when Play is pressed.

The app writes uncompressed STORE ZIP entries, so its own downloads can be restored without a compression API. Import also accepts standard DEFLATE entries when the browser supports `DecompressionStream('deflate-raw')`, with a limit on actual expanded bytes. Encrypted, multipart and ZIP64 archives, directory entries, and unrelated files are rejected. Keep the original download for the broadest browser compatibility. See the [compression API documentation](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream/DecompressionStream) and [ZIP format documentation](https://www.loc.gov/preservation/digital/formats/fdd/fdd000354.shtml).

## Version 1 recipe contract

```json
{
  "format": "openambience-mix",
  "schemaVersion": 1,
  "name": "Rainy focus",
  "mix": {
    "master": 40,
    "timerMinutes": 30,
    "binauralBeat": 6,
    "enabled": ["rain-leaves", "brown"],
    "levels": { "rain-leaves": 35, "brown": 65 }
  },
  "sounds": []
}
```

`sounds` contains descriptors only for selected custom recordings and radio stations. The same versioned contract is used inside links and ZIPs; links prohibit custom descriptors. Recipes contain one to six distinct supported sound IDs. Volumes range from 0 to 100; timer values are 0, 15, 30 or 60 minutes. `binauralBeat` retains the older mix compatibility setting; fixed binaural preset IDs retain their own frequencies and levels. Playback state and timer deadlines are excluded.

## Storage migration and offline use

The `openambience` IndexedDB database is now version 2. The existing `sounds` store is retained; the new `state` store holds the current mix and saved mix snapshot under `current`. When that snapshot is absent, the app reads `openambience.v2` or the older `openambience.v1` localStorage value and saves the normalized state into IndexedDB. Original localStorage values are retained as a migration fallback and are no longer updated. Existing sound IDs and audio blobs are unchanged. Old mixes get a timer duration of zero.

Wait for **Library ready offline** before disconnecting. The service worker includes the new portable-mix and ZIP modules. Link previews, ZIP download/import and local playback work offline once the app is cached. Radio remains online only. ZIP downloads are backups you control; browser storage can still be cleared or evicted. Stereo placement and account-based sync remain future work.
