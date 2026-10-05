// Linux Firefox + geckodriver integration check, on a private D-Bus session.
const { spawn, execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const [address, pid] = execFileSync('dbus-daemon', [
    '--session', '--fork', '--print-address=1', '--print-pid=1',
  ], { encoding: 'utf8' }).trim().split('\n');
  const env = { ...process.env, DBUS_SESSION_BUS_ADDRESS: address };
  const driver = spawn(process.env.GECKODRIVER || 'geckodriver', ['--port', '0'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let session, port;
  const call = (destination, path, method) => execFileSync('gdbus', [
    'call', '--session', '--dest', destination, '--object-path', path, '--method', method,
  ], { env, encoding: 'utf8', timeout: 10000 });
  async function request(path, body, method = 'POST') {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45000),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const { value } = await response.json();
    if (value?.error) throw new Error(JSON.stringify(value));
    return value;
  }
  const script = (code, args = []) => request(`/session/${session}/execute/sync`, { script: code, args });
  async function until(check, label) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const result = await check();
      if (result) return result;
      await wait(100);
    }
    throw new Error(`Timed out: ${label}`);
  }
  async function click(selector) {
    await script('document.querySelector(arguments[0]).scrollIntoView({block:"center"})', [selector]);
    const element = await request(`/session/${session}/element`, { using: 'css selector', value: selector });
    await request(`/session/${session}/element/${Object.values(element)[0]}/click`, {});
  }
  try {
    port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('geckodriver did not start')), 10000);
      let output = '';
      const consume = data => {
        output += data.toString();
        const match = output.match(/Listening on 127\.0\.0\.1:(\d+)/);
        if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
      };
      driver.stdout.on('data', consume); driver.stderr.on('data', consume);
      driver.once('error', error => { clearTimeout(timeout); reject(error); });
      driver.once('exit', code => { clearTimeout(timeout); reject(new Error(`geckodriver exited: ${code}`)); });
    });
    const created = await request('/session', { capabilities: { alwaysMatch: {
      browserName: 'firefox', 'moz:firefoxOptions': { binary: process.env.FIREFOX_BINARY || '/usr/bin/firefox', args: ['-headless'] },
    } } });
    session = created.sessionId;
    await request(`/session/${session}/url`, { url: process.env.PREVIEW_URL || 'http://127.0.0.1:8080/' });
    await until(() => script('return !!document.querySelector(".sound-card")'), 'app loaded');
    const binaural = await request(`/session/${session}/execute/async`, { args: [], script: `
      const done = arguments[arguments.length - 1];
      import('./js/binaural.js').then(async ({ createBinauralLayer }) => {
        const ctx = new OfflineAudioContext(2, 44100, 44100);
        const layer = createBinauralLayer(ctx, ctx.destination, 6); layer.gain.gain.value = 1;
        const buffer = await ctx.startRendering();
        const amplitude = (channel, hz) => {
          const data = buffer.getChannelData(channel); let real = 0, imaginary = 0;
          for (let i = 0; i < data.length; i++) {
            const angle = 2 * Math.PI * hz * i / 44100;
            real += data[i] * Math.cos(angle); imaginary += data[i] * Math.sin(angle);
          }
          return 2 * Math.hypot(real, imaginary) / data.length;
        };
        done({ left: amplitude(0, 200), right: amplitude(1, 206), leftLeak: amplitude(0, 206), rightLeak: amplitude(1, 200) });
      }).catch(error => done({ error: error.message }));
    ` });
    assert.ok(binaural.left > .09 && binaural.right > .09 && binaural.leftLeak < .00001 && binaural.rightLeak < .00001, JSON.stringify(binaural));
    // Exercise native vertical-range geometry and keyboard behavior in Firefox.
    await request(`/session/${session}/window/rect`, { width: 390, height: 844 });
    await click('#volume-toggle');
    assert.equal(await script('return document.activeElement.id'), 'master');
    const bounds = await script('return document.querySelector("#master").getBoundingClientRect().toJSON()');
    assert.ok(bounds.width >= 44 && bounds.height > bounds.width);
    await request(`/session/${session}/actions`, { actions: [{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions: [
      { type: 'pointerMove', duration: 0, origin: 'viewport', x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 4) },
      { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 },
    ] }] });
    const value = () => script('return Number(document.querySelector("#master").value)');
    const previous = await value(); assert.ok(previous > 60);
    const slider = await request(`/session/${session}/element`, { using: 'css selector', value: '#master' });
    const key = text => request(`/session/${session}/element/${Object.values(slider)[0]}/value`, { text });
    await key('\uE015'); assert.equal(await value(), previous - 1); // Arrow Down
    await key('\uE013'); assert.equal(await value(), previous); // Arrow Up
    await key('\uE011'); assert.equal(await value(), 0); // Home
    await key('\uE010'); assert.equal(await value(), 100); // End
    assert.equal(await script('return document.querySelector("#master-value").textContent'), '100%');
    require('node:fs').writeFileSync('/tmp/openambience-volume-firefox.png', Buffer.from(await request(`/session/${session}/screenshot`, null, 'GET'), 'base64'));
    await key('\uE00C'); // Escape
    assert.equal(await script('return document.querySelector("#volume-popout").hidden && document.activeElement.id === "volume-toggle"'), true);
    await click('#volume-toggle'); await key('\uE004'); // Tab reaches mute
    assert.equal(await script('return document.activeElement.id'), 'mute');
    const mute = await request(`/session/${session}/element`, { using: 'css selector', value: '#mute' });
    await request(`/session/${session}/element/${Object.values(mute)[0]}/value`, { text: '\uE004' }); // Tab leaves the group
    assert.equal(await script('return document.querySelector("#volume-popout").hidden'), true);
    await click('#volume-toggle'); await click('h1');
    assert.equal(await script('return document.querySelector("#volume-popout").hidden'), true);
    await script('const slider = document.querySelector("#master"); slider.value = 40; slider.dispatchEvent(new Event("input", { bubbles: true }))');
    assert.equal(await script('return navigator.mediaSession.playbackState'), 'none');
    await click('[data-sound="brown"] .sound-toggle'); await click('#play');
    await until(() => script('return navigator.mediaSession.playbackState === "playing"'), 'mix playing');
    const service = await until(() => call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus.ListNames')
      .match(/org\.mpris\.MediaPlayer2\.firefox[^']+/)?.[0], 'Firefox MPRIS service');
    for (const [command, state, label] of [
      ['Pause', 'paused', 'Play mix'], ['Play', 'playing', 'Pause mix'], ['Stop', 'none', 'Play mix'],
    ]) {
      call(service, '/org/mpris/MediaPlayer2', `org.mpris.MediaPlayer2.Player.${command}`);
      await until(() => script('return navigator.mediaSession.playbackState === arguments[0] && document.querySelector("#play").getAttribute("aria-label") === arguments[1]', [state, label]), command);
    }
    assert.equal(await script('return document.querySelectorAll(".sound-card.active").length'), 1);
    await click('#play');
    await until(() => script('return navigator.mediaSession.playbackState === "playing"'), 'resume after stop');
    await click('#play');
    // Measure the transport separately in WebDriver's isolated module realm.
    const measured = await request(`/session/${session}/execute/async`, { args: [], script: `
      const done = arguments[arguments.length - 1];
      import('./js/media-transport.js').then(async ({ MediaTransport }) => {
        const context = new AudioContext();
        const transport = new MediaTransport(context, context.destination);
        const input = context.createAnalyser(), output = context.createAnalyser();
        transport.source.connect(input); transport.silencer.connect(output);
        try {
          await Promise.all([transport.play(), context.resume()]);
          const before = new Float32Array(2048), after = new Float32Array(2048);
          let signal = false, zero = true;
          for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            input.getFloatTimeDomainData(before); output.getFloatTimeDomainData(after);
            signal ||= before.some(value => Math.abs(value) > .01);
            zero &&= after.every(value => value === 0);
          }
          transport.pause(true);
          done({ signal, zero, gain: transport.silencer.gain.value, released: !transport.media.hasAttribute('src') });
        } finally { transport.pause(true); await context.close(); }
      }).catch(error => done({ error: error.message }));
    ` });
    assert.deepEqual(measured, { signal: true, zero: true, gain: 0, released: true });
    console.log(JSON.stringify({ browser: `Firefox ${created.capabilities.browserVersion}`, checks: [
      'no autoplay', 'non-silent decoder input with exactly silent control-track output',
      'vertical volume pointer and keyboard controls, visible percentage, Escape/Tab/outside dismissal',
      'binaural tones render at separate left/right frequencies',
      'Linux MPRIS Pause/Play/Stop update the mixer', 'stop releases source and preserves selection', 'resume after stop',
    ] }, null, 2));
  } finally {
    try { if (session) await request(`/session/${session}`, null, 'DELETE'); }
    finally { driver.kill(); process.kill(Number(pid)); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
