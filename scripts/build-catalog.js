// Run after editing audio/credits.json. No runtime dependencies or build required.
import { readFile, writeFile } from 'node:fs/promises';
const credits = JSON.parse(await readFile(new URL('../audio/credits.json', import.meta.url)));
await writeFile(new URL('../js/catalog.js', import.meta.url), `// Generated from audio/credits.json by scripts/build-catalog.js.\nexport const RECORDINGS = ${JSON.stringify(credits.sounds, null, 2)};\n`);
