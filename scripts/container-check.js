// Run against a started container: node scripts/container-check.js [base URL]
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL(process.argv[2] || 'http://127.0.0.1:8080/');
async function get(path, options = {}) {
  return fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(5000) });
}

const shell = await get('./');
assert.equal(shell.status, 200);
assert.match(shell.headers.get('content-type'), /text\/html/);
assert.match(await shell.text(), /OpenAmbience/);

// Every precached resource must be present for service-worker installation.
const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const files = [...worker.match(/const FILES = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
const catalogResponse = await get('./audio/credits.json');
assert.equal(catalogResponse.status, 200);
const catalog = await catalogResponse.json();
for (const path of new Set([...files, './sw.js', './LICENSE', ...catalog.sounds.map(sound => sound.url)])) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('cache-control'), 'no-cache', path);
  const actual = Buffer.from(await response.arrayBuffer());
  const expected = await readFile(new URL(path === './' ? '../index.html' : `../${path}`, import.meta.url));
  assert.deepEqual(actual, expected, `Packaged content differs: ${path}`);
}

for (const [path, type] of [['sw.js', /javascript/], ['js/audio.js', /javascript/], ['manifest.webmanifest', /application\/manifest\+json/]]) {
  const response = await get(path);
  assert.match(response.headers.get('content-type'), type, path);
  await response.arrayBuffer();
}

const range = await get(catalog.sounds[0].url, { headers: { Range: 'bytes=0-99' } });
assert.equal(range.status, 206);
assert.match(range.headers.get('content-type'), /audio\/mpeg/);
assert.match(range.headers.get('content-range'), /^bytes 0-99\/\d+$/);
assert.equal((await range.arrayBuffer()).byteLength, 100);

for (const path of ['missing.mp3', '.git/config', '.env', 'Dockerfile', 'package.json', 'scripts/serve.js']) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  await response.arrayBuffer();
}
console.log(`Container checks passed: ${catalog.sounds.length} recordings, app shell, MIME types, cache headers, byte ranges, and private paths.`);
