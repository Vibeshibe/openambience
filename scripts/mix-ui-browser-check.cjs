// Optional isolated layout and interaction checks; see docs/testing.md.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8080/';
async function dialogFits(page, selector) {
  const dialog = page.locator(selector);
  assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true, `${selector} horizontal content`);
  const box = await dialog.boundingBox(), viewport = page.viewportSize();
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, `${selector} within viewport`);
  for (const button of await dialog.locator('button:visible').all()) {
    await button.scrollIntoViewIfNeeded();
    const rect = await button.boundingBox(); assert.ok(rect.width >= 44 && rect.height >= 44, `${selector} touch target`);
    assert.ok(rect.y >= box.y && rect.y + rect.height <= box.y + box.height + 1, `${selector} button reachable`);
  }
  await dialog.evaluate(el => { el.scrollTop = 0; });
}
async function state(page) {
  return page.evaluate(async () => {
    const { openLibrary, readLibraryState } = await import('./js/storage.js'); const db = await openLibrary();
    try { return await readLibraryState(db); } finally { db.close(); }
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const longName = 'A'.repeat(40), errors = [];
    await context.addInitScript(name => {
      localStorage.setItem('openambience.v2', JSON.stringify({ mix: { enabled: ['brown', 'rain-leaves'], timerMinutes: 30 },
        saved: [{ name: 'Rainy morning', mix: { enabled: ['brown', 'rain-leaves'], timerMinutes: 30 } }, { name, mix: { enabled: ['fire'] } }] }));
    }, longName);
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base); await page.waitForSelector('.sound-card:visible'); await page.locator('#mixes-tab').click();
    for (const [width, height] of [[320, 568], [390, 844], [768, 900], [1440, 1000], [740, 360]]) {
      await page.setViewportSize({ width, height });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      for (const card of await page.locator('.saved-item').all()) {
        assert.equal(await card.evaluate(el => el.scrollWidth <= el.clientWidth), true);
        for (const button of await card.locator('button').all()) { const rect = await button.boundingBox(); assert.ok(rect.width >= 44 && rect.height >= 44); }
      }
      await page.locator('#open-mixer').click(); await dialogFits(page, '#mixer-dialog');
      assert.equal(await page.locator('#save-form').isVisible(), false);
      await page.locator('#open-save').click(); await dialogFits(page, '#save-dialog');
      assert.equal(await page.locator('#mix-name').evaluate(el => document.activeElement === el), true);
      await page.locator('#save-dialog .close').click();
      await page.getByRole('button', { name: `Share / download ${longName}`, exact: true }).click();
      await dialogFits(page, '#transfer-dialog'); await page.locator('#create-link').click(); await dialogFits(page, '#transfer-dialog');
      if (width === 390) await page.screenshot({ path: path.join(os.tmpdir(), 'openambience-sharing-ui-mobile.png') });
      await page.locator('#transfer-dialog .close').click();
      await page.getByRole('button', { name: `Manage ${longName}`, exact: true }).click(); await dialogFits(page, '#saved-dialog');
      await page.locator('#delete-saved').click(); await dialogFits(page, '#confirm-dialog');
      assert.equal(await page.locator('#cancel-confirm').evaluate(el => document.activeElement === el), true);
      await page.locator('#cancel-confirm').click(); await page.waitForSelector('#saved-dialog[open]');
      assert.equal((await state(page)).saved.length, 2); await page.locator('#saved-dialog .close').click();
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(os.tmpdir(), `openambience-saved-mixes-${width}.png`) });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#save-current').click(); await page.locator('#mix-name').fill('A new moment');
    await page.locator('#save-form button[type="submit"]').click(); assert.equal((await state(page)).saved.length, 3);
    await page.getByRole('button', { name: 'Manage A new moment', exact: true }).click();
    await page.locator('#saved-name').fill('Renamed moment'); await page.locator('#rename-form button[type="submit"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Manage Renamed moment');
    await page.keyboard.press('Enter'); await page.locator('#duplicate-saved').click();
    assert.equal((await state(page)).saved.length, 4);
    await page.getByRole('button', { name: 'Manage Renamed moment copy', exact: true }).click();
    await page.locator('#update-saved').click(); await page.locator('#confirm-action').click();
    assert.equal((await state(page)).saved.at(-1).mix.timerMinutes, 30);
    await page.getByRole('button', { name: 'Manage Renamed moment copy', exact: true }).click();
    await page.locator('#delete-saved').click(); await page.locator('#confirm-action').click();
    assert.equal((await state(page)).saved.length, 3); assert.equal((await state(page)).mix.enabled.length, 2);
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Mix UI passed: five viewport sizes, long names, dialog bounds/scrolling, 44px targets, save/rename/copy/update/delete, deletion cancel, focus return, and sharing feedback.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
