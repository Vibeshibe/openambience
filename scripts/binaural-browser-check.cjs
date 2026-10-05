// Optional real audio-render and UI checks using the existing Playwright setup.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      window.__contexts = []; window.__tones = [];
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...args) { super(...args); window.__contexts.push(this); }
        createOscillator() {
          const tone = super.createOscillator(), stop = tone.stop.bind(tone);
          tone.stop = (...args) => { tone.__stopped = true; return stop(...args); };
          window.__tones.push(tone); return tone;
        }
      };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:8080/');
    await page.waitForSelector('[data-sound="binaural-6"]');
    assert.equal(await page.evaluate(() => window.__contexts.length), 0);
    assert.equal(await page.locator('[data-sound="birds"] .sound-name').textContent(), 'Morning birds');
    const spectra = await page.evaluate(async () => {
      const { AudioEngine } = await import('./js/audio.js');
      const { SOUNDS, normalizeMix } = await import('./js/state.js');
      const { BINAURAL_BEATS } = await import('./js/binaural.js');
      const results = [];
      const amplitude = (data, frequency, rate) => {
        let real = 0, imaginary = 0;
        for (let i = 0; i < rate; i++) {
          const angle = 2 * Math.PI * frequency * i / rate, value = data[rate + i];
          real += value * Math.cos(angle); imaginary += value * Math.sin(angle);
        }
        return 2 * Math.hypot(real, imaginary) / rate;
      };
      for (const beat of BINAURAL_BEATS) {
        const ctx = new OfflineAudioContext(2, 48000 * 2, 48000);
        const engine = new AudioEngine(id => SOUNDS.find(sound => sound.id === id));
        engine.context = ctx; engine.master = ctx.createGain();
        engine.master.connect(ctx.createDynamicsCompressor()).connect(ctx.destination);
        const mix = normalizeMix({ enabled: ['binaural'], master: 100, levels: { binaural: 100 }, binauralBeat: beat });
        await engine.update(mix);
        const rendered = await ctx.startRendering(), left = rendered.getChannelData(0), right = rendered.getChannelData(1);
        results.push({ beat, left: amplitude(left, 200, ctx.sampleRate), right: amplitude(right, 200 + beat, ctx.sampleRate),
          leftLeak: amplitude(left, 200 + beat, ctx.sampleRate), rightLeak: amplitude(right, 200, ctx.sampleRate),
          finite: left.every(Number.isFinite) && right.every(Number.isFinite) });
        engine.remove(mix.enabled[0]);
      }
      return results;
    });
    for (const result of spectra) {
      assert.ok(result.finite);
      // The app's master compressor applies makeup gain even to quiet tones.
      assert.ok(result.left > .025 && result.left < .08 && result.right > .025 && result.right < .08, JSON.stringify(result));
      assert.ok(Math.abs(result.left / result.right - 1) < .01, 'Balanced channel levels');
      assert.ok(result.leftLeak < .00001 && result.rightLeak < .00001, JSON.stringify(result));
    }
    const toggle = id => page.locator(`[data-sound="${id}"] .sound-toggle`);
    assert.equal(await page.locator('[data-kind="binaural"]:visible').count(), 3);
    assert.equal(await page.locator('[data-kind="binaural"] select').count(), 0);
    await toggle('binaural-6').click(); await toggle('brown').click();
    await page.locator('#play').click();
    await page.waitForFunction(() => navigator.mediaSession.playbackState === 'playing');
    await page.waitForFunction(() => window.__tones.some(tone => !tone.__stopped && Math.abs(tone.frequency.value - 206) < .01));
    await toggle('binaural-6').click(); await toggle('binaural-10').click();
    await page.waitForFunction(() => window.__tones.some(tone => !tone.__stopped && Math.abs(tone.frequency.value - 210) < .01));
    assert.equal(await page.evaluate(() => window.__tones.filter(tone => !tone.__stopped).length), 2, 'Switching presets cleans up previous oscillators');
    await page.locator('#play').click();
    assert.equal(await page.evaluate(() => window.__contexts[0].state), 'suspended');
    await page.locator('#play').click();
    await page.waitForFunction(() => window.__contexts[0].state === 'running');
    await toggle('binaural-10').click();
    await page.waitForFunction(() => window.__tones.every(tone => tone.__stopped));
    await toggle('binaural-10').click();
    await page.waitForFunction(() => window.__tones.filter(tone => !tone.__stopped).length === 2);
    await page.locator('#open-mixer').click(); await page.locator('#mix-name').fill('Headphones');
    await page.locator('#save-form button').click(); await page.locator('#mixer-dialog .close').click();
    await toggle('binaural-10').click(); await toggle('binaural-2').click();
    await page.locator('#mixes-tab').click();
    await page.getByRole('button', { name: 'Headphones', exact: true }).click();
    assert.equal(await toggle('binaural-10').getAttribute('aria-pressed'), 'true');
    assert.equal(await toggle('binaural-2').getAttribute('aria-pressed'), 'false');
    await page.locator('#library-tab').click();
    await page.locator('[data-sound="binaural-2"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/openambience-binaural-mobile.png' });
    await page.waitForFunction(() => document.querySelector('#offline').textContent.includes('ready offline'));
    await page.reload(); await page.waitForSelector('[data-sound="binaural-6"]');
    assert.equal(await toggle('binaural-10').getAttribute('aria-pressed'), 'true');
    assert.equal(await toggle('binaural-2').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => window.__contexts.length), 0);
    await context.setOffline(true);
    await page.reload(); await page.waitForSelector('[data-sound="binaural-6"]');
    await page.locator('#play').click();
    await page.waitForFunction(() => navigator.mediaSession.playbackState === 'playing');
    await page.clock.install();
    await page.locator('#open-mixer').click(); await page.locator('#timer').selectOption('15');
    await page.locator('#mixer-dialog .close').click(); await page.clock.fastForward(901000);
    await page.waitForFunction(() => window.__contexts[0].state === 'suspended');
    assert.match(await page.locator('#status').textContent(), /Sleep timer finished/);
    await context.setOffline(false);
    await page.evaluate(() => localStorage.setItem('openambience.v2', JSON.stringify({
      schemaVersion: 2, mix: { enabled: ['binaural'], binauralBeat: 14, levels: { binaural: 37 }, master: 40 }, saved: []
    })));
    await page.reload();
    await page.waitForSelector('[data-sound="binaural"]');
    assert.equal(await page.locator('[data-sound="binaural"] .sound-name').textContent(), 'Saved binaural 14 Hz');
    assert.equal(await page.locator('#volume-binaural').inputValue(), '37');
    assert.equal(await page.locator('[data-kind="binaural"]:visible').count(), 4);
    await page.locator('#play').click();
    await page.waitForFunction(() => window.__tones.some(tone => !tone.__stopped && Math.abs(tone.frequency.value - 214) < .01));
    await toggle('binaural').click();
    await page.waitForFunction(() => window.__contexts[0].state === 'suspended');
    assert.equal(await page.locator('[data-sound="binaural"]').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: await browser.version(), spectra, checks: ['all beat presets rendered through the master compressor with isolated stereo frequencies', 'three preset cards without dropdowns', 'preset switching cleans up oscillators', 'legacy saved frequencies and levels preserved', 'pause/resume and oscillator cleanup', 'saved mix and offline reload preserve beat selection without autoplay', 'offline playback and sleep timer', 'no page errors'] }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
