const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8080/';
function wav(frequency) {
  const bytes = Buffer.alloc(44 + 16000), size = bytes.length;
  bytes.write('RIFF'); bytes.writeUInt32LE(size - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(16000, 40);
  for (let i = 0; i < 8000; i++) bytes.writeInt16LE(Math.round(Math.sin(i * frequency * 2 * Math.PI / 8000) * 1000), 44 + i * 2);
  return bytes;
}
async function drop(page, files, directory = false, target = 'body') {
  const transfer = await page.evaluateHandle(({ files, directory }) => {
    const data = new DataTransfer();
    for (const file of files) data.items.add(new File([Uint8Array.from(atob(file.bytes), char => char.charCodeAt(0))], file.name, { type: file.type }));
    if (directory) Object.defineProperty(data, 'items', { value: [{ kind:'file', webkitGetAsEntry: () => ({ isDirectory:true }) }] });
    return data;
  }, { files: files.map(file => ({ ...file, bytes: file.bytes.toString('base64') })), directory });
  await page.dispatchEvent(target, 'dragenter', { dataTransfer: transfer });
  assert.equal(await page.locator('#file-drop-overlay').isVisible(), true);
  await page.dispatchEvent(target, 'drop', { dataTransfer: transfer }); await transfer.dispose();
  assert.equal(await page.locator('#file-drop-overlay').isVisible(), false);
}
async function snapshot(page) {
  return page.evaluate(async () => {
    const { openLibrary, listSounds, readLibraryState } = await import('./js/storage.js'); const db = await openLibrary();
    try { return { sounds: (await listSounds(db)).map(({ blob, ...sound }) => ({ ...sound, size: blob?.size })), state: await readLibraryState(db) }; }
    finally { db.close(); }
  });
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      window.__persist = false;
      Object.defineProperty(navigator, 'storage', { configurable: true, value: {
        estimate: async () => ({ usage: 123456, quota: 10485760 }), persisted: async () => window.__persist,
        persist: async () => window.__persist,
      } });
    });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base); await page.waitForSelector('.sound-card:visible');
    const first = { name: 'My rain.wav', type: 'audio/wav', bytes: wav(200) }, second = { name: 'My river.wav', type: 'audio/wav', bytes: wav(400) };
    await drop(page, [first, second]); await page.waitForSelector('#upload-dialog[open]');
    assert.match(await page.locator('#upload-selection').textContent(), /2 selected/);
    assert.equal((await snapshot(page)).sounds.length, 0); // review before writing
    await page.locator('#upload-category').selectOption('Water'); await page.locator('#import-submit').click();
    await page.waitForFunction(() => !document.querySelector('#upload-dialog').open);
    assert.equal((await snapshot(page)).sounds.length, 2);
    await drop(page, [first]); await page.waitForSelector('#upload-dialog[open]'); await page.locator('#import-submit').click();
    await page.waitForFunction(() => document.querySelector('#import-status').textContent.includes('already in your library'));
    await page.locator('#upload-dialog .close').click(); assert.equal((await snapshot(page)).sounds.length, 2);
    await page.locator('[data-kind="custom"] .sound-toggle').first().click();
    await page.locator('#open-mixer').click(); await page.locator('#open-save').click(); await page.locator('#mix-name').fill('Water focus');
    await page.locator('#save-form button[type="submit"]').click();
    const sound = (await snapshot(page)).sounds.find(sound => sound.name === 'My rain');
    await page.locator('#manage-storage').click(); await page.waitForFunction(() => document.querySelector('#storage-estimate').textContent.includes('approximately'));
    assert.match(await page.locator('#recording-usage').textContent(), /KiB/); assert.equal(await page.locator('#recording-slots').textContent(), '2 / 30');
    await page.locator('#persist-storage').click(); assert.match(await page.locator('#storage-status').textContent(), /did not grant/);
    await page.evaluate(() => { window.__persist = true; }); await page.locator('#persist-storage').click();
    assert.equal(await page.locator('#persist-storage').isDisabled(), true);
    const row = page.locator('.storage-recording').filter({ has: page.getByRole('heading', { name: 'My rain', exact: true }) });
    await row.locator('summary').click(); assert.match(await row.textContent(), /Water focus/);
    const download = page.waitForEvent('download'); await row.getByRole('button', { name: 'Download recording My rain', exact: true }).click();
    assert.deepEqual(await fs.readFile(await (await download).path()), first.bytes);
    for (const [width, height] of [[320,568],[390,844],[768,900],[1440,1000],[740,360]]) {
      await page.setViewportSize({ width, height }); const dialog = page.locator('#storage-dialog');
      assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
      const box = await dialog.boundingBox(); assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1);
      await dialog.evaluate(el => { el.scrollTop = el.scrollHeight; });
      const close = await page.locator('#storage-dialog .close').boundingBox(); assert.ok(close.y >= box.y && close.y + close.height <= box.y + box.height);
      await dialog.evaluate(el => { el.scrollTop = 0; });
      if (width === 390) await page.screenshot({ path: path.join(os.tmpdir(), 'openambience-storage-mobile.png') });
    }
    await page.setViewportSize({ width:390, height:844 }); await row.getByRole('button', { name: 'Remove recording My rain', exact: true }).click();
    assert.equal(await page.locator('#confirm-remove-sound').isDisabled(), true); assert.match(await page.locator('#remove-sound-usage').textContent(), /Water focus/);
    await page.getByRole('button', { name: 'Keep sound', exact:true }).click(); await page.waitForSelector('#storage-dialog[open]');
    assert.equal((await snapshot(page)).sounds.length, 2);
    await row.getByRole('button', { name: 'Remove recording My rain', exact: true }).click(); await page.locator('#remove-references').check();
    // Force a synchronous settings-write failure after delete was queued.
    await page.evaluate(() => { const original = IDBObjectStore.prototype.put; window.__put = original; IDBObjectStore.prototype.put = function(...args) { if(this.name === 'state') throw new DOMException('Simulated quota failure','QuotaExceededError'); return original.apply(this,args); }; });
    await page.locator('#confirm-remove-sound').click(); await page.waitForFunction(() => document.querySelector('#remove-sound-status').textContent.includes('Could not remove'));
    let current = await snapshot(page); assert.equal(current.sounds.length, 2); assert.ok(current.state.saved[0].mix.enabled.includes(sound.id));
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.__put; });
    await page.locator('#confirm-remove-sound').click(); await page.waitForSelector('#storage-dialog[open]');
    current = await snapshot(page); assert.equal(current.sounds.length, 1); assert.equal(current.state.saved[0].name, 'Water focus');
    assert.equal(current.state.saved[0].mix.enabled.includes(sound.id), false); assert.equal(current.state.mix.enabled.includes(sound.id), false);
    await page.locator('#storage-dialog .close').click();
    // Missing storage APIs do not hide the recording inventory.
    await page.evaluate(() => Object.defineProperty(navigator,'storage',{ configurable:true, value:undefined }));
    await page.locator('#manage-storage').click(); await page.waitForFunction(() => document.querySelector('#storage-estimate').textContent.includes('does not provide'));
    assert.equal(await page.locator('.storage-recording').count(),1); assert.equal(await page.locator('#persist-storage').isVisible(),false);
    await page.locator('#storage-dialog .close').click();
    // Export a real built-in ZIP, then drop it through the normal restore flow.
    await page.locator('#filter-toggle').click(); await page.locator('#clear-filters').click(); await page.locator('#filter-toggle').click();
    await page.locator('[data-sound="brown"] .sound-toggle').click(); await page.locator('#open-mixer').click(); await page.locator('#share-current').click();
    const archiveDownload = page.waitForEvent('download'); await page.locator('#download-mix').click(); const zip = await fs.readFile(await (await archiveDownload).path());
    await page.locator('#transfer-dialog .close').click();
    const archive = { name:'Mix.zip', type:'application/zip', bytes:zip };
    await page.locator('#open-mixer').click(); await page.locator('#open-save').click(); await page.locator('#mix-name').fill('Keep this draft');
    await drop(page,[first]); await page.waitForFunction(() => document.querySelector('#save-status').textContent.includes('Close this dialog'));
    assert.equal(await page.locator('#mix-name').inputValue(),'Keep this draft'); await page.locator('#save-dialog .close').click();
    await drop(page,[first,archive]); await page.waitForFunction(() => document.querySelector('#status').textContent.includes('on its own'));
    assert.equal(await page.locator('dialog[open]').count(),0);
    await drop(page,[first],true); assert.match(await page.locator('#status').textContent(),/rather than folders/);
    await drop(page,[archive]); await page.waitForFunction(() => !document.querySelector('#restore-preview').hidden);
    assert.equal(await page.locator('#mix-zip').evaluate(element => element.files[0]?.name), archive.name);
    await page.locator('#restore-dialog .close').click(); await page.locator('#mixes-tab').click(); await page.locator('#import-mix').click();
    assert.match(await page.locator('#restore-file-field').textContent(), /Choose or drop a mix ZIP/);
    assert.equal(await page.locator('#restore-preview').isHidden(), true);
    assert.equal(await page.locator('#mix-zip').inputValue(), '');
    await drop(page,[archive],false,'#restore-file-field'); await page.waitForFunction(() => !document.querySelector('#restore-preview').hidden);
    const replacement = { ...archive, name:'A very long replacement mix filename for checking the mobile ZIP drop area.zip' };
    await drop(page,[replacement],false,'#mix-zip'); await page.waitForFunction(() => !document.querySelector('#restore-preview').hidden);
    assert.equal(await page.locator('#mix-zip').evaluate(element => element.files[0]?.name), replacement.name);
    assert.equal(await page.locator('#play').getAttribute('aria-label'), 'Play mix');
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:844});
      const dialog = page.locator('#restore-dialog'), box = await dialog.boundingBox();
      assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), true);
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= 845);
      if (width === 390) await page.screenshot({path:path.join(os.tmpdir(), 'openambience-zip-drop-mobile.png')});
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('#restore-mix').click(); await page.waitForFunction(() => !document.querySelector('#restore-dialog').open);
    // A different tab's newly added reference makes the old preview invalid.
    await page.locator('#manage-storage').click(); await page.getByRole('button',{name:'Remove recording My river',exact:true}).click();
    await page.evaluate(async id => { const {openLibrary,readLibraryState,commitLibraryState}=await import('./js/storage.js');const db=await openLibrary();const state=await readLibraryState(db);state.saved.push({name:'Other tab',mix:{...state.mix,enabled:[id]}});await commitLibraryState(db,state);db.close(); }, current.sounds[0].id);
    await page.locator('#confirm-remove-sound').click(); await page.waitForFunction(() => document.querySelector('#remove-sound-status').textContent.includes('references changed'));
    assert.equal((await snapshot(page)).sounds.length,1);
    await page.locator('#remove-sound-dialog .close').click(); await page.locator('#storage-dialog .close').click();
    await page.reload(); await page.waitForSelector('.sound-card:visible');
    // Station metadata has no audio bytes, but follows the same consent flow.
    await page.locator('#add-radio').click(); await page.locator('#radio-name').fill('Metadata station');
    await page.locator('#radio-url').fill('https://example.com/live.mp3'); await page.locator('#radio-form button').click();
    await page.waitForFunction(() => !document.querySelector('#radio-dialog').open);
    await page.locator('[data-kind="radio"] .sound-toggle').click(); await page.locator('#open-mixer').click(); await page.locator('#open-save').click();
    await page.locator('#mix-name').fill('With station'); await page.locator('#save-form button[type="submit"]').click();
    await page.locator('[data-kind="radio"] .remove-sound').click(); assert.equal(await page.locator('#confirm-remove-sound').isDisabled(),true);
    await page.locator('#remove-references').check(); await page.locator('#confirm-remove-sound').click();
    await page.waitForFunction(() => !document.querySelector('#remove-sound-dialog').open);
    assert.equal((await snapshot(page)).sounds.some(sound => sound.kind === 'radio'),false);
    assert.equal((await snapshot(page)).state.saved.find(item => item.name === 'With station').mix.enabled.some(id => id.startsWith('radio-')),false);
    await page.waitForFunction(() => document.querySelector('#offline').textContent.includes('ready offline'));
    await context.setOffline(true); await page.reload(); await page.waitForSelector('.sound-card', { state:'attached' });
    await drop(page,[first]); await page.waitForSelector('#upload-dialog[open]'); await page.locator('#import-submit').click(); await page.waitForFunction(() => !document.querySelector('#upload-dialog').open);
    assert.equal((await snapshot(page)).sounds.length,2); assert.deepEqual(errors,[]);
    console.log('Storage/drop passed: reviewed batch imports, duplicates, downloads, mix impact, explicit consent, cancellation, atomic rollback, stale references, API fallbacks, persistence outcomes, ZIP/mixed/folder drops, five layouts, and offline imports.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
