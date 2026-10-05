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
      'Linux MPRIS Pause/Play/Stop update the mixer', 'stop releases source and preserves selection', 'resume after stop',
    ] }, null, 2));
  } finally {
    try { if (session) await request(`/session/${session}`, null, 'DELETE'); }
    finally { driver.kill(); process.kill(Number(pid)); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
