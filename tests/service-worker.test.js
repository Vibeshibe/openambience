import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const scope = 'https://example.test/openambience/';
const catalog = { sounds: [{ url: './audio/rain.mp3' }] };

async function installedWorker() {
  const handlers = new Map(), entries = new Map(), stores = new Map();
  const cache = {
    async addAll(paths) {
      for (const path of paths) entries.set(new URL(path, scope).href,
        path === './audio/credits.json' ? JSON.stringify(catalog) : 'cached content');
    },
    async match(path) {
      const content = entries.get(new URL(path, scope).href);
      return content === undefined ? undefined : new Response(content);
    },
    async keys() { return [...entries.keys()].map(url => ({ url })); },
  };
  const cacheStorage = {
    async open(name) { if (!stores.has(name)) stores.set(name, cache); return stores.get(name); },
  };
  runInNewContext(source, {
    self: { registration: { scope }, addEventListener(type, handler) { handlers.set(type, handler); } },
    caches: cacheStorage, URL,
    fetch: async () => new Response(JSON.stringify(catalog)),
  });
  let installation;
  handlers.get('install')({ waitUntil(promise) { installation = promise; } });
  await installation;
  return { handlers, entries, stores, cacheStorage };
}

async function status(worker) {
  let completion, result, closed = false;
  worker.handlers.get('message')({
    data: { type: 'OFFLINE_STATUS' },
    ports: [{ postMessage(message) { result = message; }, close() { closed = true; } }],
    waitUntil(promise) { completion = promise; },
  });
  await completion;
  assert.equal(closed, true);
  return result.ready;
}

test('installed worker verifies its complete library under a project subdirectory', async () => {
  assert.equal(await status(await installedWorker()), true);
});

test('a missing recording is incomplete even with a complete stale cache', async () => {
  const worker = await installedWorker();
  const staleEntries = [...worker.entries.keys()].map(url => ({ url }));
  worker.stores.set('openambience-shell-old', {
    async match() { return new Response(JSON.stringify(catalog)); },
    async keys() { return staleEntries; },
  });
  worker.entries.delete(new URL('./audio/rain.mp3', scope).href);
  assert.equal(await status(worker), false);
});

test('missing shell files, invalid catalogs, and unavailable storage cannot report ready', async () => {
  const worker = await installedWorker();
  worker.entries.delete(new URL('./app.js', scope).href);
  assert.equal(await status(worker), false);
  worker.entries.set(new URL('./audio/credits.json', scope).href, 'invalid JSON');
  assert.equal(await status(worker), false);
  worker.cacheStorage.open = async () => { throw new Error('Storage unavailable'); };
  assert.equal(await status(worker), false);
});
