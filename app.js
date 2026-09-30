import { SOUNDS, PRESETS, normalizeMix, presetMix, readStore } from './js/state.js';
import { AudioEngine } from './js/audio.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* Private modes can block access. */ }
let { mix, saved } = readStore(storage);
const engine = new AudioEngine();
let playing = false;
let deadline = 0;
let busy = false;
let installPrompt;
const status = message => { $('#status').textContent = message; };

function persist() {
  try { storage.setItem('openambience.v1', JSON.stringify({ mix, saved })); }
  catch { status('Your mix works for this visit, but this browser could not save it.'); }
}
function scheduleTimer() {
  const remaining = deadline ? Math.max(0, (deadline - Date.now()) / 1000) : 0;
  engine.scheduleSleep(remaining, mix.master);
}
function sync() {
  for (const sound of SOUNDS) {
    const card = $(`[data-sound="${sound.id}"]`);
    const enabled = mix.enabled.includes(sound.id);
    card.classList.toggle('active', enabled);
    card.querySelector('button').setAttribute('aria-pressed', String(enabled));
    card.querySelector('input').value = mix.levels[sound.id];
    card.querySelector('output').value = `${mix.levels[sound.id]}%`;
  }
  $('#master').value = mix.master;
  $('#master-value').value = `${mix.master}%`;
  $('#layer-count').textContent = mix.enabled.length ? `${mix.enabled.length} sound${mix.enabled.length === 1 ? '' : 's'} in your mix.` : 'Choose a sound to begin.';
  $('#play').textContent = playing ? 'Pause mix' : 'Play mix';
  $('#play').setAttribute('aria-pressed', String(playing));
  if (playing) { engine.update(mix); scheduleTimer(); }
  persist();
}

for (const sound of SOUNDS) {
  const card = document.createElement('article');
  card.className = 'sound-card';
  card.dataset.sound = sound.id;
  // Only static, project-owned catalog strings enter this template.
  card.innerHTML = `<button class="sound-toggle" aria-pressed="false"><span class="sound-icon" aria-hidden="true">${sound.icon}</span><span class="sound-name">${sound.name}</span><span class="indicator" aria-hidden="true">✓</span></button><p>${sound.description}</p><label class="volume-label" for="volume-${sound.id}"><span>${sound.name} volume</span><output for="volume-${sound.id}">50%</output></label><input id="volume-${sound.id}" type="range" min="0" max="100" value="50">`;
  card.querySelector('button').addEventListener('click', () => {
    mix.enabled = mix.enabled.includes(sound.id) ? mix.enabled.filter(id => id !== sound.id) : [...mix.enabled, sound.id];
    sync();
  });
  card.querySelector('input').addEventListener('input', event => {
    mix.levels[sound.id] = Number(event.target.value); sync();
  });
  $('#sounds').append(card);
}

async function pause(message) {
  await engine.pause();
  playing = false;
  deadline = 0;
  $('#countdown').textContent = '';
  sync();
  if (message) status(message);
}
$('#play').addEventListener('click', async () => {
  if (busy) return;
  if (!playing && !mix.enabled.length) { status('Choose at least one sound, or try a preset below.'); return; }
  busy = true; $('#play').disabled = true;
  try {
    if (playing) await pause('Paused. Your mix is ready whenever you are.');
    else {
      await engine.play(mix);
      playing = true;
      const minutes = Number($('#timer').value);
      deadline = minutes ? Date.now() + minutes * 60000 : 0;
      sync(); status('Take your time. Your mix is playing.');
    }
  } catch (error) { status(`Could not start audio. ${error.message}`); }
  finally { busy = false; $('#play').disabled = false; }
});
$('#master').addEventListener('input', event => { mix.master = Number(event.target.value); sync(); });
$('#timer').addEventListener('change', () => {
  const minutes = Number($('#timer').value);
  deadline = playing && minutes ? Date.now() + minutes * 60000 : 0;
  scheduleTimer();
  $('#countdown').textContent = '';
  status(minutes ? `Timer set for ${minutes} minutes${playing ? '.' : ', starting when you press play.'}` : 'Sleep timer off.');
});
async function checkTimer() {
  if (!deadline || busy) return;
  const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  $('#countdown').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  if (!seconds) {
    busy = true;
    try { await pause('Sleep timer finished. Rest well.'); }
    finally { busy = false; }
  }
}
setInterval(checkTimer, 1000);
document.addEventListener('visibilitychange', checkTimer);
$('#reset').addEventListener('click', async () => {
  if (busy) return;
  busy = true;
  try {
    await pause(); mix = normalizeMix(); $('#timer').value = '0'; sync();
    status('A fresh start. Choose a sound to begin.');
  } finally { busy = false; }
});
$('#search').addEventListener('input', event => {
  const query = event.target.value.trim().toLowerCase();
  let count = 0;
  for (const sound of SOUNDS) {
    const visible = `${sound.name} ${sound.description}`.toLowerCase().includes(query);
    $(`[data-sound="${sound.id}"]`).hidden = !visible;
    if (visible) count++;
  }
  $('#empty').hidden = count > 0;
});
for (const preset of PRESETS) {
  const button = document.createElement('button');
  button.className = 'preset';
  button.innerHTML = `${preset.name}<small>${preset.note}</small>`;
  button.addEventListener('click', () => {
    mix = { ...presetMix(preset.levels), master: mix.master }; sync();
    status(`${preset.name} selected.${playing ? '' : ' Press play when you’re ready.'}`);
  });
  $('#presets').append(button);
}
function renderSaved() {
  $('#saved-mixes').replaceChildren();
  saved.forEach((item, index) => {
    const group = document.createElement('div'); group.className = 'saved-item';
    const button = document.createElement('button'); button.textContent = item.name;
    button.addEventListener('click', () => { mix = normalizeMix(item.mix); sync(); status(`${item.name} loaded.`); });
    const remove = document.createElement('button'); remove.textContent = '×';
    remove.setAttribute('aria-label', `Delete ${item.name}`);
    remove.addEventListener('click', () => { saved.splice(index, 1); persist(); renderSaved(); });
    group.append(button, remove); $('#saved-mixes').append(group);
  });
}
$('#save-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#mix-name').value.trim();
  if (!name) { status('Give your mix a name first.'); return; }
  if (!mix.enabled.length) { status('Choose a sound before saving a mix.'); return; }
  if (saved.length >= 20) { status('You have 20 saved mixes. Delete one to make room.'); return; }
  saved.push({ name, mix: normalizeMix(mix) });
  status(`Saved “${name}” on this device.`); persist(); renderSaved(); $('#mix-name').value = '';
});
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; $('#install').hidden = false;
});
$('#install').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt(); installPrompt = null; $('#install').hidden = true;
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => status('Offline setup was unavailable. You can still use the mixer online.'));
}
renderSaved(); sync();
