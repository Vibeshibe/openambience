// Real service-worker upgrades on an isolated local origin; see docs/testing.md.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
const root = resolve(__dirname, '..');
const version = require('../package.json').version;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
let release = 1;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = resolve(root, `.${url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname}`);
    if (!path.startsWith(root + sep)) throw new Error('Outside root');
    let body = await readFile(path);
    if (['.html', '.js'].includes(extname(path))) {
      body = body.toString().replaceAll(version, `${version}-check-${release}`);
      if (extname(path) === '.html') body = body.replace('<html ', `<html data-release="${release}" `);
    }
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        async suspend() { localStorage.setItem('update-check-paused', 'yes'); return super.suspend(); }
      };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const origin = `http://127.0.0.1:${server.address().port}/`;
    await page.goto(origin);
    await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector('#offline').textContent.includes('ready offline'));
    assert.equal(await page.locator('#update-notice').isVisible(), false, 'No update card on first install');
    assert.equal(await page.locator('#show-update').isVisible(), false);
    await page.locator('[data-sound="brown"] .sound-toggle').click();
    await page.locator('#volume-toggle').click(); await page.locator('#master').fill('27');
    await page.locator('#play').click();
    await page.waitForFunction(() => navigator.mediaSession.playbackState === 'playing');
    const other = await context.newPage();
    other.on('pageerror', error => errors.push(error.message));
    await other.goto(origin); await other.locator('#play').click();
    await other.waitForFunction(() => navigator.mediaSession.playbackState === 'playing');
    await page.locator('#search').focus();
    release = 2;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForSelector('#update-notice:visible');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'search', 'Update does not steal focus');
    assert.equal(await page.evaluate(() => navigator.mediaSession.playbackState), 'playing');
    assert.equal(await page.locator('html').getAttribute('data-release'), '1');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      for (const selector of ['#update', '#defer-update']) {
        const box = await page.locator(selector).boundingBox(); assert.ok(box.width >= 44 && box.height >= 44);
      }
      if (width === 390) await page.screenshot({ path: '/tmp/openambience-update-mobile.png' });
    }
    await page.locator('#defer-update').click();
    assert.equal(await page.locator('#update-notice').isVisible(), false);
    assert.equal(await page.locator('#show-update').isVisible(), true);
    const notification=await page.getByRole('button', {name:'Update available',exact:true}).boundingBox();
    assert.equal(notification.width,notification.height); assert.ok(notification.width>=44);
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await page.locator('.update-dot').evaluate(dot=>getComputedStyle(dot).animationName),'update-pulse');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.update-dot').evaluate(dot=>getComputedStyle(dot).animationName),'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await page.evaluate(() => navigator.mediaSession.playbackState), 'playing');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'show-update');
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    assert.equal(await page.locator('#update-notice').isVisible(), false, 'Same waiting update stays deferred');
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator('#install').evaluate(button => { button.hidden = false; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Install and deferred update fit together');
    await page.screenshot({path:'/tmp/openambience-update-notification.png'});
    await page.locator('#show-update').click();
    assert.equal(await page.locator('#update-notice').isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'update');
    assert.equal(await page.evaluate(() => navigator.mediaSession.playbackState), 'playing');
    await other.locator('#defer-update').click();
    await page.evaluate(() => localStorage.removeItem('update-check-paused'));
    await Promise.all([page.waitForEvent('load'), page.locator('#update').click()]);
    await page.waitForSelector('.sound-card');
    assert.equal(await page.locator('html').getAttribute('data-release'), '2');
    assert.equal(await page.evaluate(() => localStorage.getItem('update-check-paused')), 'yes', 'Explicit update pauses audio');
    assert.equal(await page.locator('#master').inputValue(), '27');
    assert.equal(await page.locator('[data-sound="brown"] .sound-toggle').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false', 'No autoplay after update');
    assert.equal(await page.locator('#update-notice').isVisible(), false);
    await other.waitForFunction(() => document.querySelector('#show-update').hidden);
    assert.equal(await other.locator('html').getAttribute('data-release'), '1', 'Other tab does not reload');
    assert.equal(await other.evaluate(() => navigator.mediaSession.playbackState), 'playing', 'Other tab keeps playing');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: await browser.version(), checks: ['no notice on first install', 'real waiting update shown without stealing focus or interrupting playback', 'responsive card and header', 'Later and reopen preserve playback', 'explicit update pauses and reloads with mix/volume preserved', 'other tabs keep playing and remove stale update links', 'no page errors'] }, null, 2));
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
