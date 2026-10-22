// Shared feedback regression checks, in an isolated profile; see docs/testing.md.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8080/';
async function expectSuccess(page, text) {
  assert.equal(await page.locator('#player-notice').getAttribute('data-tone'), 'success');
  assert.equal(await page.locator('#notice-icon').isVisible(), true);
  assert.equal(await page.locator('#status').textContent(), text);
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await page.evaluate(() => document.querySelector('#player-notice') === window.__notice), true);
}
async function expire(page) {
  await page.mouse.move(0, 0);
  await page.clock.fastForward(5000); await page.clock.runFor(200);
  assert.equal(await page.locator('#dismiss-status').isVisible(), false);
}
async function snapshot(page) {
  return page.evaluate(async () => {
    const { openLibrary, readLibraryState } = await import('./js/storage.js'); const db = await openLibrary();
    try { return (await readLibraryState(db)).mix; } finally { db.close(); }
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const savedName = 'S'.repeat(40);
    await context.addInitScript(name => localStorage.setItem('openambience.v2', JSON.stringify({
      mix: { enabled: ['brown'], master: 65, timerMinutes: 30 },
      saved: [{ name, mix: { enabled: ['rain-leaves'], master: 12, timerMinutes: 15 } }],
    })), savedName);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base); await page.waitForSelector('.sound-card:visible');
    await page.evaluate(() => { window.__notice = document.querySelector('#player-notice'); });
    await page.clock.install(); await page.locator('#mixes-tab').click();
    for (const name of ['Deep focus', 'Coastal pause', 'Slow evening']) {
      await page.locator('.preset').filter({ hasText: name }).click();
      await expectSuccess(page, `Loaded “${name}”.`);
      const mix = await snapshot(page);
      assert.equal(mix.master, 65); assert.equal(mix.timerMinutes, 30);
      assert.equal(await page.locator('#play').getAttribute('aria-label'), 'Play mix');
      await expire(page);
    }
    const savedButton = page.getByRole('button', { name: `Load ${savedName}`, exact: true });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 }); await savedButton.click();
      await expectSuccess(page, `Loaded “${savedName}”.`);
      const notice = page.locator('#player-notice'), rect = await notice.boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width);
      assert.equal(await notice.evaluate(el => el.scrollWidth <= el.clientWidth), true);
      const close = await page.locator('#dismiss-status').boundingBox(); assert.ok(close.width >= 44 && close.height >= 44);
      await expire(page);
    }
    let mix = await snapshot(page); assert.equal(mix.master, 12); assert.equal(mix.timerMinutes, 15);
    await page.setViewportSize({ width: 390, height: 844 });
    // Presets retain the active countdown; a saved mix starts its saved duration.
    await page.locator('#play').click(); await page.waitForFunction(() => {
      const play = document.querySelector('#play'); return play.getAttribute('aria-label') === 'Pause mix' && play.getAttribute('aria-busy') === 'false';
    });
    await page.clock.fastForward(60000); await page.locator('#open-mixer').click();
    await page.waitForFunction(() => /^\d+:\d+/.test(document.querySelector('#countdown').textContent));
    const remaining = () => page.locator('#countdown').evaluate(el => {
      if (!el.textContent.includes(':')) throw new Error(`Missing countdown: ${el.textContent}; ${document.querySelector('#status').textContent}`);
      const [minutes, seconds] = el.textContent.split(':'); return Number(minutes) * 60 + Number(seconds.split(' ')[0]);
    });
    const beforePreset = await remaining(); assert.ok(beforePreset <= 841);
    await page.locator('#mixer-dialog .close').click(); await page.locator('.preset').first().click();
    await page.locator('#open-mixer').click(); assert.ok(Math.abs(await remaining() - beforePreset) <= 10);
    await page.locator('#mixer-dialog .close').click(); await savedButton.click(); await page.clock.runFor(1000);
    await page.locator('#open-mixer').click();
    const afterSaved = await remaining(); assert.ok(afterSaved >= 890, `Saved duration restarts: ${afterSaved} seconds`);
    await page.locator('#mixer-dialog .close').click(); await page.locator('#play').click();
    await page.locator('.preset').first().click(); await expectSuccess(page, 'Loaded “Deep focus”.');
    await page.screenshot({ path: path.join(os.tmpdir(), 'openambience-preset-feedback.png') });
    // Replacing a fading success cancels its pending hide callback.
    await page.mouse.move(0, 0); await page.clock.fastForward(5000);
    await page.locator('.preset').nth(1).evaluate(el => el.click());
    await page.clock.runFor(200); await expectSuccess(page, 'Loaded “Coastal pause”.');
    // Hover and focus pause expiry, and leaving resumes it without polling.
    await page.locator('#player-notice').hover(); await page.clock.fastForward(6000);
    assert.equal(await page.locator('#dismiss-status').isVisible(), true);
    await expire(page);
    await savedButton.click(); await page.locator('#dismiss-status').focus(); await page.clock.fastForward(6000);
    assert.equal(await page.locator('#dismiss-status').isVisible(), true);
    await page.keyboard.press('Enter'); assert.equal(await savedButton.evaluate(el => el === document.activeElement), true);
    await page.locator('#save-current').click(); await page.locator('#mix-name').fill('Shared feedback');
    await page.locator('#save-form button[type="submit"]').click(); await expectSuccess(page, 'Saved “Shared feedback”.');
    await page.getByRole('button', { name: 'Manage Shared feedback', exact: true }).click(); await page.locator('#duplicate-saved').click();
    await expectSuccess(page, 'Copied “Shared feedback copy”.');
    await page.getByRole('button', { name: 'Manage Shared feedback copy', exact: true }).click();
    await page.locator('#saved-name').fill('Renamed'); await page.locator('#rename-form button[type="submit"]').click();
    await expectSuccess(page, 'Renamed “Renamed”.');
    await page.getByRole('button', { name: 'Manage Renamed', exact: true }).click();
    await page.locator('#update-saved').click(); await page.locator('#confirm-action').click(); await expectSuccess(page, 'Updated “Renamed”.');
    await page.getByRole('button', { name: 'Manage Renamed', exact: true }).click();
    await page.locator('#delete-saved').click(); await page.locator('#confirm-action').click(); await expectSuccess(page, 'Deleted “Renamed”.');
    // A warning replacing a success must stay visible after its old timer expires.
    await page.locator('#library-tab').click();
    for (const id of ['brown', 'white', 'pink', 'wind', 'ocean']) await page.locator(`[data-sound="${id}"] .sound-toggle`).click();
    await page.locator('[data-sound="fire"] .sound-toggle').click();
    assert.match(await page.locator('#status').textContent(), /Six sounds/);
    assert.equal(await page.locator('#player-notice').getAttribute('data-tone'), 'notice');
    assert.equal(await page.locator('#notice-icon').isVisible(), false);
    await page.mouse.move(0, 0); await page.clock.fastForward(6000);
    assert.equal(await page.locator('#dismiss-status').isVisible(), true);
    await page.locator('#volume-toggle').click(); assert.equal(await page.locator('#dismiss-status').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('Shared feedback passed: all presets, saved loads, saves, edits, one reused notice, mobile bounds, timer replacement, hover/focus pauses, focus return, and persistent warnings.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
