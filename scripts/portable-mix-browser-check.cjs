// Optional isolated browser checks; see docs/testing.md for setup.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8080/';
const errors = [];
async function ready(page) { page.on('pageerror', error => errors.push(error.message)); await page.goto(base); await page.waitForSelector('.sound-card:visible'); }
async function snapshot(page) {
  return page.evaluate(async () => {
    const { openLibrary, readLibraryState, listSounds } = await import('./js/storage.js');
    const db = await openLibrary();
    try { return { state: await readLibraryState(db), sounds: (await listSounds(db)).map(({ blob, ...sound }) => sound) }; }
    finally { db.close(); }
  });
}
async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((input, value) => { input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true })); }, value);
}
async function chooseCategory(page, name) {
  if (!await page.locator('#filters').evaluate(element => element.open)) await page.locator('#filter-toggle').click();
  for (const checkbox of await page.locator('#categories input:checked').all()) await checkbox.uncheck();
  if (name) await page.getByRole('checkbox', { name, exact: true }).check();
  await page.locator('#filter-toggle').click();
}
async function importZip(page, buffer) {
  await page.locator('#mixes-tab').click(); await page.locator('#import-mix').click();
  await page.locator('#mix-zip').setInputFiles({ name: 'backup.openambience.zip', mimeType: 'application/zip', buffer });
  await page.waitForFunction(() => !document.querySelector('#restore-preview').hidden);
}
async function completeRestore(page) {
  await page.locator('#restore-mix').click();
  await page.waitForFunction(() => !document.querySelector('#restore-dialog').open);
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true });
  try {
    const sourceContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const source = await sourceContext.newPage(); await ready(source);
    await source.locator('[data-sound="brown"] .sound-toggle').click();
    await source.locator('[data-sound="binaural-20"] .sound-toggle').click();
    await setRange(source, '[data-sound="brown"] input', 23);
    await setRange(source, '[data-sound="binaural-20"] input', 17);
    await setRange(source, '#master', 62);
    await source.locator('#open-mixer').click(); await source.locator('#timer').selectOption('30');
    await source.locator('#open-save').click();
    await source.locator('#mix-name').fill('Morning ☀ 雨'); await source.locator('#save-form button[type="submit"]').click();
    await source.locator('#mixes-tab').click();
    await source.getByRole('button', { name: 'Share / download Morning ☀ 雨', exact: true }).click(); await source.locator('#create-link').click();
    const link = await source.locator('#share-link').inputValue(); assert.match(link, /#mix=v1\./);
    for (const width of [320, 390, 768, 1440]) {
      await source.setViewportSize({ width, height: 844 });
      assert.equal(await source.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const dialog = await source.locator('#transfer-dialog').boundingBox(); assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= width + 1);
    }
    await source.locator('#transfer-dialog .close').click();

    const linkContext = await browser.newContext(); const linked = await linkContext.newPage();
    linked.on('pageerror', error => errors.push(error.message));
    await linked.goto(link); await linked.waitForSelector('#restore-dialog[open]');
    assert.equal(await linked.locator('#restore-name').textContent(), 'Morning ☀ 雨');
    assert.equal((await snapshot(linked)).state.mix.enabled.length, 0);
    await completeRestore(linked);
    let state = (await snapshot(linked)).state;
    assert.equal(state.mix.master, 62); assert.equal(state.mix.timerMinutes, 30);
    assert.equal(state.mix.levels.brown, 23); assert.equal(state.mix.levels['binaural-20'], 17);
    assert.equal(state.saved.length, 0); assert.equal(await linked.locator('#play').getAttribute('aria-pressed'), 'false');
    // Loading a link during playback pauses it before replacing the selection.
    await linked.locator('#play').click();
    await linked.waitForFunction(() => document.querySelector('#play').getAttribute('aria-pressed') === 'true');
    await linked.evaluate(hash => { location.hash = '#library'; location.hash = hash; }, new URL(link).hash);
    await linked.waitForSelector('#restore-dialog[open]'); await completeRestore(linked);
    assert.equal(await linked.locator('#play').getAttribute('aria-pressed'), 'false');

    await source.locator('#library-tab').click(); await source.locator('#add-sounds').click();
    await source.locator('#sound-files').setInputFiles({ name: 'Personal rain.mp3', mimeType: 'audio/mpeg', buffer: await fs.readFile(path.join(__dirname, '../audio/rain-leaves.mp3')) });
    await source.locator('#upload-category').selectOption('Weather'); await source.locator('#import-submit').click();
    await source.waitForFunction(() => !document.querySelector('#upload-dialog').open);
    await source.locator('[data-kind="custom"] .sound-toggle').click(); await setRange(source, '[data-kind="custom"] input', 28);
    await source.locator('#add-radio').click(); await source.locator('#radio-name').fill('Example station');
    await source.locator('#radio-url').fill('https://example.com/live.mp3'); await source.locator('#radio-form button').click();
    await source.waitForFunction(() => !document.querySelector('#radio-dialog').open);
    await source.locator('[data-kind="radio"] .sound-toggle').click(); await setRange(source, '[data-kind="radio"] input', 34);
    await source.locator('#open-mixer').click(); await source.locator('#share-current').click();
    await source.locator('#transfer-name').fill('Personal weather');
    assert.equal(await source.locator('#create-link').isDisabled(), true);
    const downloadPromise = source.waitForEvent('download'); await source.locator('#download-mix').click();
    const download = await downloadPromise, buffer = await fs.readFile(await download.path());
    assert.match(download.suggestedFilename(), /\.openambience\.zip$/);
    await source.locator('#transfer-dialog .close').click();
    console.log('Link preview, saved timer, Unicode, download, and responsive sharing passed.');

    const targetContext = await browser.newContext({ viewport: { width: 320, height: 844 } });
    await targetContext.addInitScript(() => {
      if (!localStorage.getItem('migration-seeded')) {
        localStorage.setItem('openambience.v2', JSON.stringify({ mix: { enabled: ['white'], master: 21 }, saved: [{ name: 'Keep me', mix: { enabled: ['white'], master: 21 } }] }));
        localStorage.setItem('migration-seeded', '1');
      }
    });
    const target = await targetContext.newPage(); await ready(target);
    assert.equal((await snapshot(target)).state.saved[0].name, 'Keep me');
    await importZip(target, buffer);
    assert.equal(await target.locator('#restore-name').textContent(), 'Personal weather');
    assert.equal(await target.locator('#restore-sounds li').count(), 4);
    // Force a real transaction abort after the first sound add; neither sounds
    // nor recipes may remain partially restored.
    await target.evaluate(() => {
      const original = IDBObjectStore.prototype.add; window.__restoreAdd = original;
      IDBObjectStore.prototype.add = function (...args) { const request = original.apply(this, args); this.transaction.abort(); return request; };
    });
    await target.locator('#restore-mix').click();
    await target.waitForFunction(() => document.querySelector('#restore-status').textContent.includes('Could not restore'));
    let restored = await snapshot(target);
    assert.equal(restored.sounds.length, 0); assert.equal(restored.state.saved.length, 1); assert.deepEqual(restored.state.mix.enabled, ['white']);
    await target.evaluate(() => { IDBObjectStore.prototype.add = window.__restoreAdd; });
    // A synchronous failure writing settings must also abort previously queued
    // sound adds; merely rejecting the Promise would permit a partial commit.
    await target.evaluate(() => {
      const original = IDBObjectStore.prototype.put; window.__restorePut = original;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'state') throw new DOMException('Simulated storage quota failure', 'QuotaExceededError');
        return original.apply(this, args);
      };
    });
    await target.locator('#restore-mix').click();
    await target.waitForFunction(() => document.querySelector('#restore-status').textContent.includes('Simulated storage quota failure'));
    restored = await snapshot(target); assert.equal(restored.sounds.length, 0); assert.equal(restored.state.saved.length, 1);
    await target.evaluate(() => { IDBObjectStore.prototype.put = window.__restorePut; });
    await completeRestore(target);
    restored = await snapshot(target);
    assert.equal(restored.sounds.length, 2); assert.equal(restored.state.saved.length, 2);
    assert.equal(restored.state.saved[0].name, 'Keep me'); assert.equal(restored.state.mix.timerMinutes, 30);
    const imported = restored.sounds.find(sound => sound.kind === 'custom');
    assert.equal(imported.name, 'Personal rain'); assert.equal(imported.category, 'Weather');
    assert.equal(restored.state.mix.levels[imported.id], 28);
    const station = restored.sounds.find(sound => sound.kind === 'radio'); assert.equal(restored.state.mix.levels[station.id], 34);
    assert.equal(await target.locator('#play').getAttribute('aria-pressed'), 'false');
    await target.locator('[data-kind="custom"] select').selectOption('Water');
    await importZip(target, buffer); await completeRestore(target);
    restored = await snapshot(target); assert.equal(restored.sounds.length, 2);
    assert.equal(restored.sounds.find(sound => sound.kind === 'custom').category, 'Water');
    assert.equal(restored.state.saved.length, 3);
    console.log('Fresh-profile restore, legacy migration, transaction rollback, metadata preservation, and duplicate reuse passed.');

    await target.waitForFunction(() => document.querySelector('#offline').textContent.includes('Library ready offline'), { timeout: 60000 });
    await target.reload(); await target.waitForSelector('.sound-card:visible');
    assert.equal(await target.locator('#play').getAttribute('aria-pressed'), 'false');
    assert.equal((await snapshot(target)).state.mix.timerMinutes, 30);
    await targetContext.setOffline(true); await target.reload(); await target.waitForSelector('.sound-card:visible');
    await target.locator('#play').click();
    await target.waitForFunction(() => document.querySelector('#play').getAttribute('aria-pressed') === 'true');
    await target.locator('#play').click();
    await target.locator('#open-mixer').click(); await target.locator('#share-current').click();
    const offlineDownload = target.waitForEvent('download'); await target.locator('#download-mix').click(); await offlineDownload;
    await target.screenshot({ path: path.join(os.tmpdir(), 'openambience-portable-mobile.png') });
    assert.equal(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    console.log('Offline reload, imported playback, offline ZIP download, and no autoplay passed.');
    assert.deepEqual(errors, []); console.log('Portable mix browser checks passed with no page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
