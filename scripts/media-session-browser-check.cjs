// Optional browser checks: see docs/testing.md for setup.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__contexts = [];
      window.__transports = [];
      window.__audioSession = { type: 'auto' };
      Object.defineProperty(navigator, 'audioSession', { value: window.__audioSession });
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...args) { super(...args); window.__contexts.push(this); }
        createMediaElementSource(media) {
          if (media.crossOrigin !== 'anonymous') window.__transports.push(media);
          return super.createMediaElementSource(media);
        }
        async decodeAudioData(...args) {
          if (window.__holdDecode) {
            window.__decodeStarted = true;
            await new Promise(resolve => { window.__releaseDecode = resolve; });
          }
          if (window.__failDecode) throw new Error('Test decode failure');
          return super.decodeAudioData(...args);
        }
      };
      window.__actions = {};
      const session = navigator.mediaSession;
      const register = session.setActionHandler.bind(session);
      session.setActionHandler = (action, handler) => {
        window.__actions[action] = handler;
        register(action, handler);
      };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = process.env.PREVIEW_URL || 'http://127.0.0.1:8080/';
    await page.clock.install();
    await page.goto(url);
    await page.waitForSelector('.sound-card');
    const session = () => page.evaluate(() => ({
      state: navigator.mediaSession.playbackState,
      title: navigator.mediaSession.metadata?.title ?? null,
      artist: navigator.mediaSession.metadata?.artist,
      artwork: navigator.mediaSession.metadata?.artwork,
    }));
    const action = name => page.evaluate(name => window.__actions[name](), name);
    const ready = () => page.waitForFunction(() => !document.querySelector('#play').disabled);
    const toggle = id => page.locator(`[data-sound="${id}"] .sound-toggle`).click();
    assert.equal((await session()).state, 'none');
    assert.equal((await session()).title, null);
    await action('play');
    assert.equal(await page.evaluate(() => window.__contexts.length), 0);
    await toggle('brown');
    await page.locator('#play').click(); await ready();
    assert.equal((await session()).state, 'playing');
    assert.deepEqual(await page.evaluate(() => ({
      type: window.__audioSession.type, paused: window.__transports[0].paused,
      muted: window.__transports[0].muted, duration: window.__transports[0].duration,
    })), { type: 'playback', paused: false, muted: false, duration: 10 });
    assert.match((await session()).title, /Brown/);
    assert.equal((await session()).artist, 'OpenAmbience');
    for (const artwork of (await session()).artwork) assert.ok((await context.request.get(artwork.src)).ok());
    await action('play');
    assert.equal((await session()).state, 'playing', 'play must not toggle to pause');
    await toggle('white');
    assert.match((await session()).title, /White/);
    await action('pause'); await action('pause');
    assert.equal((await session()).state, 'paused');
    assert.equal(await page.evaluate(() => window.__transports[0].paused), true);
    assert.equal(await page.evaluate(() => window.__contexts[0].state), 'suspended');
    await action('play'); await ready();
    await page.evaluate(() => window.__contexts[0].suspend());
    await page.waitForFunction(() => navigator.mediaSession.playbackState === 'paused');
    assert.match(await page.locator('#status').textContent(), /interrupted/);
    await action('play'); await ready();
    await action('stop');
    assert.equal((await session()).state, 'none');
    assert.equal((await session()).title, null);
    assert.equal(await page.evaluate(() => window.__transports[0].hasAttribute('src')), false);
    assert.equal(await page.locator('.sound-card.active').count(), 2);
    await action('play'); await ready();
    await toggle('white'); await toggle('brown');
    assert.equal((await session()).state, 'none');
    assert.equal(await page.evaluate(() => window.__contexts[0].state), 'suspended');

    // Delay loading to exercise a hardware pause arriving during a fetch/decode.
    await page.evaluate(() => { window.__holdDecode = true; });
    await toggle('rain-leaves');
    await page.locator('#play').click();
    await page.waitForFunction(() => window.__decodeStarted);
    await action('pause');
    await page.evaluate(() => { window.__holdDecode = false; window.__releaseDecode(); });
    await ready();
    assert.notEqual((await session()).state, 'playing');
    assert.equal(await page.evaluate(() => window.__contexts[0].state), 'suspended');
    await page.evaluate(() => { window.__failDecode = true; });
    await action('play'); await ready();
    assert.notEqual((await session()).state, 'playing');
    assert.match(await page.locator('#status').textContent(), /Could not play/);
    await page.evaluate(() => { window.__failDecode = false; });
    await action('play'); await ready();
    assert.equal((await session()).state, 'playing');

    await page.locator('#open-mixer').click();
    await page.locator('#timer').selectOption('15');
    await page.locator('#mixer-dialog .close').click();
    await page.clock.fastForward(901000);
    await page.waitForFunction(() => navigator.mediaSession.playbackState === 'paused');
    assert.match(await page.locator('#status').textContent(), /Sleep timer finished/);
    await action('play'); await ready();
    await page.clock.fastForward(1000);
    assert.match(await page.locator('#countdown').textContent(), /14:59/);
    await action('stop');
    assert.equal(await page.locator('#countdown').textContent(), 'Ready when you are');
    await page.waitForFunction(() => document.querySelector('#offline').textContent.includes('ready offline'));
    await page.reload(); await page.waitForSelector('.sound-card');
    await context.setOffline(true);
    await page.reload(); await page.waitForSelector('.sound-card');
    assert.equal((await session()).state, 'none');
    assert.equal(await page.evaluate(() => window.__contexts.length), 0);
    await page.locator('#play').click(); await ready();
    assert.equal((await session()).state, 'playing');
    await action('pause');
    assert.equal((await session()).state, 'paused');
    assert.deepEqual(errors, []);
    await context.close();

    const fallback = await browser.newContext();
    await fallback.addInitScript(() => Object.defineProperty(navigator, 'mediaSession', { value: undefined }));
    const fallbackPage = await fallback.newPage();
    fallbackPage.on('pageerror', error => errors.push(error.message));
    await fallbackPage.goto(url); await fallbackPage.waitForSelector('.sound-card');
    await fallbackPage.locator('[data-sound="brown"] .sound-toggle').click();
    await fallbackPage.locator('#play').click();
    await fallbackPage.waitForFunction(() => document.querySelector('#play').getAttribute('aria-label') === 'Pause mix');
    await fallbackPage.locator('#play').click();
    assert.equal(await fallbackPage.locator('#play').getAttribute('aria-label'), 'Play mix');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: await browser.version(), checks: [
      'no autoplay or empty-mix playback', 'native metadata and artwork', 'idempotent actions',
      'pause/resume/stop', 'simulated audio interruption', 'empty mix', 'pause during loading',
      'timer expiry and restart', 'offline reload and controls', 'unsupported API fallback', 'no page errors',
    ] }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
