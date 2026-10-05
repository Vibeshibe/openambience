// Linux-only integration check. Uses a private D-Bus, never the desktop's players.
// Requires Playwright, Chromium, dbus-daemon, and gdbus; see docs/testing.md.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

(async () => {
  const [address, pid] = execFileSync('dbus-daemon', [
    '--session', '--fork', '--print-address=1', '--print-pid=1',
  ], { encoding: 'utf8' }).trim().split('\n');
  const env = { ...process.env, DBUS_SESSION_BUS_ADDRESS: address };
  const call = (destination, path, method) => execFileSync('gdbus', [
    'call', '--session', '--dest', destination, '--object-path', path, '--method', method,
  ], { env, encoding: 'utf8', timeout: 10000 });
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true,
      ignoreDefaultArgs: ['--mute-audio'], env,
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:8080/');
    await page.locator('[data-sound="brown"] .sound-toggle').click();
    await page.locator('#volume-toggle').click();
    await page.locator('#master').fill('1');
    await page.locator('#play').click();
    await page.waitForFunction(() => navigator.mediaSession.playbackState === 'playing');
    const internals = await browser.newPage();
    await internals.goto('chrome://media-internals');
    await internals.getByRole('button', { name: 'Audio Focus', exact: true }).click();
    await internals.waitForFunction(() => /Gain Active Playing.*HasAudio.*Controllable/.test(document.body.innerText));

    let service;
    for (let attempt = 0; attempt < 30 && !service; attempt++) {
      const names = call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus.ListNames');
      service = names.match(/org\.mpris\.MediaPlayer2\.chromium[^']+/)?.[0];
      if (!service) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(service, 'Chromium must expose a Linux media-control service');
    // These commands enter through the OS interface, not captured JS callbacks.
    for (const [command, state, label] of [
      ['Pause', 'paused', 'Play mix'], ['Play', 'playing', 'Pause mix'], ['Stop', 'none', 'Play mix'],
    ]) {
      call(service, '/org/mpris/MediaPlayer2', `org.mpris.MediaPlayer2.Player.${command}`);
      await page.waitForFunction(state => navigator.mediaSession.playbackState === state, state);
      await page.waitForFunction(label => document.querySelector('#play').getAttribute('aria-label') === label, label);
    }
    assert.equal(await page.locator('.sound-card.active').count(), 1);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: await browser.version(), checks: [
      'persistent Gain audio focus with HasAudio and Controllable',
      'Linux MPRIS Pause/Play/Stop update the mixer', 'stop preserves selected sounds', 'no page errors',
    ] }, null, 2));
  } finally {
    await browser?.close();
    process.kill(Number(pid));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
