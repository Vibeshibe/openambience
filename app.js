import { SOUNDS, PRESETS, normalizeMix, presetMix, readStore } from './js/state.js';
import { CATEGORIES, CUSTOM_CATEGORIES, categoryOf, matchesCategory } from './js/categories.js';
import { normalizeRadioUrl } from './js/radio.js';
import { AudioEngine } from './js/audio.js';
import { openLibrary, listSounds, putSound, deleteSound } from './js/storage.js';

const $ = selector => document.querySelector(selector);
let storage, db;
try { storage = window.localStorage; } catch {}
let catalog = [...SOUNDS];
const status = message => { $('#status').textContent = message; $('#dialog-status').textContent = message; };
try { db = await openLibrary(); catalog.push(...await listSounds(db)); }
catch { status('Local sound storage is unavailable. The built-in library still works.'); $('#add-sounds').disabled = true; $('#add-radio').disabled = true; }
let { mix, saved } = readStore(storage, catalog);
const radioStates = new Map();
const engine = new AudioEngine(id => catalog.find(sound => sound.id === id), (id, state) => { radioStates.set(id, state); renderRadioStates(); });
let playing = false, busy = false, deadline = 0, category = 'All sounds', installPrompt;
const symbols = { rain: '☂', thunder: 'ϟ', wind: '≋', ocean: '≈', water: '≋', fire: '♨', bird: '♪', moon: '☾', cup: '☕', fan: '✺', cat: '♧' };
try { const previous = storage?.getItem('openambience.category'); if (CATEGORIES.includes(previous)) category = previous; } catch {}
const normalize = value => normalizeMix(value, catalog);
function persist() {
  // Do not overwrite recipes with custom IDs if their database could not load.
  if (!db) return;
  try { storage.setItem('openambience.v2', JSON.stringify({ schemaVersion: 2, mix, saved })); }
  catch { status('Browser storage is full or blocked. Changes will only last for this visit.'); }
}
function scheduleTimer() { engine.scheduleSleep(deadline ? Math.max(0, (deadline - Date.now()) / 1000) : 0, mix.master); }
let audioUpdating = false, audioDirty = false;
async function updateAudio() {
  if (!playing) return;
  audioDirty = true;
  if (audioUpdating) return;
  audioUpdating = true;
  try {
    while (audioDirty && playing) {
      audioDirty = false;
      await engine.update(normalize(mix));
    }
    if (playing) scheduleTimer();
  } catch (error) { await pause(); status(error.message); }
  finally { audioUpdating = false; }
}
function sync() {
  for (const card of $('#sounds').querySelectorAll('.sound-card')) {
    const id = card.dataset.sound, enabled = mix.enabled.includes(id);
    card.classList.toggle('active', enabled);
    card.querySelector('.sound-toggle').setAttribute('aria-pressed', String(enabled));
    card.querySelector('.indicator').textContent = enabled ? '✓' : '+';
    card.querySelector('input').value = mix.levels[id];
    card.querySelector('output').value = `${mix.levels[id]}%`;
  }
  $('#master').value = mix.master;
  $('#master-value').value = `${mix.master}%`;
  $('#play').textContent = busy ? 'Loading…' : playing ? 'Ⅱ Pause' : '▶ Play mix';
  $('#play').disabled = busy;
  $('#play').setAttribute('aria-pressed', String(playing));
  $('#layer-count').textContent = mix.enabled.length ? `${mix.enabled.length} sound${mix.enabled.length === 1 ? '' : 's'} selected` : 'Your quiet starts here';
  if (!deadline) $('#countdown').textContent = playing ? 'Playing your mix' : 'Ready when you are';
  $('#active-names').textContent = mix.enabled.map(id => catalog.find(sound => sound.id === id)?.name).join(' · ') || 'Choose sounds from the library first.';
  $('#sound-total').textContent = catalog.length;
  $('#mix-total').textContent = saved.length;
  filterSounds(); renderRadioStates(); persist();
}
function filterSounds() {
  const query = $('#search').value.trim().toLowerCase();
  const matchesSearch = sound => `${sound.name} ${categoryOf(sound)}`.toLowerCase().includes(query);
  let count = 0;
  const visibleGroups = new Set();
  for (const card of $('#sounds').querySelectorAll('.sound-card')) {
    const sound = catalog.find(item => item.id === card.dataset.sound);
    card.hidden = !matchesSearch(sound) || !matchesCategory(sound, category, mix.enabled);
    if (!card.hidden) { count++; visibleGroups.add(categoryOf(sound)); }
  }
  for (const heading of $('#sounds').querySelectorAll('.sound-group-heading')) heading.hidden = category !== 'All sounds' || !visibleGroups.has(heading.dataset.category);
  for (const button of $('#categories').children) {
    button.setAttribute('aria-pressed', String(button.dataset.category === category));
    button.querySelector('.category-count').textContent = catalog.filter(sound => matchesSearch(sound) && matchesCategory(sound, button.dataset.category, mix.enabled)).length;
  }
  $('#empty').hidden = count > 0;
  $('#empty').textContent = query ? 'No sounds match your search in this category.' : category === 'Radio' ? 'Add a station using ＋ Radio. Your saved stations will appear here.' : category === 'My sounds' ? 'Choose ＋ Add sounds to import recordings from your device.' : category === 'In your mix' ? 'Select sounds from the library to build your mix.' : 'No sounds in this category yet.';
  $('#visible-count').textContent = `${count} sound${count === 1 ? '' : 's'}`;
  $('#category-heading').textContent = category;
  $('#radio-hint').hidden = category !== 'Radio';
}
function renderRadioStates() {
  for (const card of $('#sounds').querySelectorAll('[data-kind="radio"]')) {
    const state = radioStates.get(card.dataset.sound) || { state: 'idle', message: navigator.onLine === false ? 'Offline · Connect to play this station' : 'Online only · Direct stream' };
    card.querySelector('.radio-state').textContent = state.message;
    card.querySelector('.retry-radio').hidden = !playing || !mix.enabled.includes(card.dataset.sound) || !['error', 'offline'].includes(state.state);
    card.querySelector('.retry-radio').disabled = navigator.onLine === false;
  }
}
function selectCategory(name) {
  category = name;
  try { storage?.setItem('openambience.category', name); } catch {}
  filterSounds();
}
function renderSounds() {
  $('#sounds').replaceChildren();
  let previousGroup;
  const ordered = [...catalog].sort((a, b) => CATEGORIES.indexOf(categoryOf(a)) - CATEGORIES.indexOf(categoryOf(b)));
  for (const sound of ordered) {
    const group = categoryOf(sound);
    if (group !== previousGroup) {
      const heading = document.createElement('h3'); heading.className = 'sound-group-heading'; heading.dataset.category = group; heading.textContent = group;
      $('#sounds').append(heading); previousGroup = group;
    }
    const card = document.createElement('article');
    card.className = 'sound-card'; card.dataset.sound = sound.id; card.dataset.kind = sound.kind || 'generated';
    // The template contains only project-owned markup. Names use textContent.
    card.innerHTML = '<button class="sound-toggle" aria-pressed="false"><span class="sound-icon" aria-hidden="true"></span><span class="sound-name"></span><span class="indicator" aria-hidden="true">+</span></button><p class="sound-kind"></p><label class="volume-label"><span>Volume</span><output>50%</output></label><input type="range" min="0" max="100" value="50">';
    card.querySelector('.sound-name').textContent = sound.name;
    card.querySelector('.sound-icon').textContent = sound.kind === 'radio' ? '◉' : symbols[sound.icon] || sound.icon || '♫';
    card.querySelector('.sound-kind').textContent = sound.kind === 'radio' ? 'INTERNET RADIO · ONLINE ONLY' : sound.kind === 'custom' ? 'ON THIS DEVICE' : sound.kind === 'recording' ? (sound.mode === 'event' ? 'RECORDING · OCCASIONAL' : 'FIELD RECORDING') : 'GENERATED TEXTURE';
    const slider = card.querySelector('input'); slider.id = `volume-${sound.id}`;
    slider.setAttribute('aria-label', `${sound.name} volume`);
    card.querySelector('label').htmlFor = slider.id;
    card.querySelector('output').htmlFor = slider.id;
    card.querySelector('.sound-toggle').onclick = () => {
      if (mix.enabled.includes(sound.id)) mix.enabled = mix.enabled.filter(id => id !== sound.id);
      else if (mix.enabled.length < 6) mix.enabled.push(sound.id);
      else { status('Six sounds are already selected. Remove one to make room.'); return; }
      sync(); void updateAudio();
    };
    slider.oninput = () => { mix.levels[sound.id] = Number(slider.value); sync(); void updateAudio(); };
    if (sound.kind === 'radio') {
      const info = document.createElement('p'); info.className = 'radio-state hint'; info.setAttribute('role', 'status');
      const retry = document.createElement('button'); retry.className = 'retry-radio'; retry.textContent = 'Retry station'; retry.hidden = true;
      retry.onclick = () => engine.retryRadio(sound.id);
      card.append(info, retry);
    }
    if (sound.kind === 'custom') {
      const label = document.createElement('label'); label.className = 'custom-category'; label.textContent = 'Category';
      const select = document.createElement('select'); select.setAttribute('aria-label', `${sound.name} category`);
      for (const name of CUSTOM_CATEGORIES) { const option = document.createElement('option'); option.value = name; option.textContent = name; select.append(option); }
      select.value = categoryOf(sound);
      select.onchange = async () => {
        select.disabled = true;
        try { const updated = { ...sound, category: select.value }; await putSound(db, updated); Object.assign(sound, updated); renderSounds(); sync(); status('Recording category saved on this device.'); }
        catch { select.value = categoryOf(sound); status('Could not save the category. Please try again.'); }
        finally { select.disabled = false; }
      };
      label.append(select); card.append(label);
    }
    if (sound.kind === 'custom' || sound.kind === 'radio') {
      const remove = document.createElement('button'); remove.className = 'remove-sound'; remove.textContent = sound.kind === 'radio' ? 'Remove station' : 'Remove recording';
      remove.onclick = async () => {
        if (!confirm(`Remove “${sound.name}” from this device and your saved mixes?`)) return;
        try {
          await deleteSound(db, sound.id); engine.remove(sound.id);
          catalog = catalog.filter(item => item.id !== sound.id);
          mix = normalize(mix); saved = saved.map(item => ({ ...item, mix: normalize(item.mix) }));
          renderSounds(); renderSaved(); sync(); status(`${sound.kind === 'radio' ? 'Station' : 'Recording'} removed. Saved mixes have been updated.`);
        } catch { status('Could not remove this sound. Please try again.'); }
      };
      card.append(remove);
    }
    $('#sounds').append(card);
  }
}
for (const name of CATEGORIES) {
  const button = document.createElement('button'); button.dataset.category = name; button.setAttribute('aria-label', name);
  const label = document.createElement('span'); label.textContent = name;
  const count = document.createElement('span'); count.className = 'category-count'; count.setAttribute('aria-hidden', 'true');
  button.append(label, count); button.onclick = () => selectCategory(name);
  $('#categories').append(button);
}
$('#search').oninput = filterSounds;
function showView(name) {
  $('#library').hidden = name !== 'library'; $('#mixes').hidden = name !== 'mixes';
  $('#library-tab').setAttribute('aria-pressed', String(name === 'library'));
  $('#mixes-tab').setAttribute('aria-pressed', String(name === 'mixes'));
}
$('#library-tab').onclick = () => showView('library');
$('#mixes-tab').onclick = () => showView('mixes');
async function pause() { playing = false; deadline = 0; await engine.pause(); sync(); }
$('#play').onclick = async () => {
  if (busy) return;
  if (!playing && !mix.enabled.length) { status('Choose a sound from the library first.'); return; }
  busy = true; sync();
  try {
    if (playing) { await pause(); status('Paused. Your mix is ready whenever you are.'); }
    else {
      await engine.play(normalize(mix)); playing = true;
      await updateAudio();
      if (!playing) return;
      const minutes = Number($('#timer').value); deadline = minutes ? Date.now() + minutes * 60000 : 0;
      scheduleTimer(); status('Settle in. Your mix is playing.');
    }
  } catch (error) { await pause(); status(`Could not play this mix. ${error.message}`); }
  finally { busy = false; sync(); }
};
$('#master').oninput = event => { mix.master = Number(event.target.value); sync(); void updateAudio(); };
$('#timer').onchange = () => {
  const minutes = Number($('#timer').value); deadline = playing && minutes ? Date.now() + minutes * 60000 : 0;
  scheduleTimer(); sync();
  status(minutes ? `Timer set for ${minutes} minutes${playing ? '.' : ', starting when you press play.'}` : 'Sleep timer off.');
};
async function checkTimer() {
  if (!deadline || busy) return;
  const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  $('#countdown').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} remaining`;
  if (!seconds) { await pause(); status('Sleep timer finished. Rest well.'); }
}
setInterval(checkTimer, 1000); document.addEventListener('visibilitychange', checkTimer);
$('#reset').onclick = async () => { if (busy) return; await pause(); mix = normalize(); $('#timer').value = '0'; sync(); status('Mix cleared. A little space to start again.'); };
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close').onclick = () => dialog.close();
  dialog.onclick = event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientY < bounds.top || event.clientY > bounds.bottom || event.clientX < bounds.left || event.clientX > bounds.right) dialog.close(); } };
}
const openMixer = () => { $('#dialog-status').textContent = ''; $('#mixer-dialog').showModal(); };
$('#open-mixer').onclick = openMixer; $('#save-current').onclick = openMixer;
for (const preset of PRESETS) {
  const button = document.createElement('button'); button.className = 'preset'; button.textContent = preset.name;
  const note = document.createElement('small'); note.textContent = preset.note; button.append(note);
  button.onclick = () => { mix = { ...presetMix(preset.levels), master: mix.master }; mix = normalize(mix); sync(); void updateAudio(); status(`${preset.name} selected.`); };
  $('#presets').append(button);
}
function renderSaved() {
  $('#saved-mixes').replaceChildren(); $('#no-mixes').hidden = saved.length > 0;
  saved.forEach((item, index) => {
    const group = document.createElement('article'); group.className = 'saved-item';
    const button = document.createElement('button'); button.className = 'load-mix'; button.textContent = item.name;
    button.onclick = () => { mix = normalize(item.mix); sync(); void updateAudio(); status(`${item.name} loaded.`); };
    group.append(button);
    for (const action of ['Update', 'Rename', 'Duplicate', 'Delete']) {
      const control = document.createElement('button'); control.textContent = action; control.setAttribute('aria-label', `${action} ${item.name}`);
      control.onclick = () => {
        if (action === 'Update') { if (!mix.enabled.length) { status('Select sounds before updating a mix.'); return; } if (!confirm(`Replace “${item.name}” with your current selection?`)) return; item.mix = normalize(mix); }
        if (action === 'Rename') { const name = prompt('Name this mix', item.name)?.trim(); if (!name) return; item.name = name.slice(0, 40); }
        if (action === 'Duplicate') { if (saved.length >= 20) { status('You have 20 saved mixes. Delete one first.'); return; } saved.push({ name: `${item.name} copy`.slice(0, 40), mix: normalize(item.mix) }); }
        if (action === 'Delete') { if (!confirm(`Delete saved mix “${item.name}”?`)) return; saved.splice(index, 1); }
        renderSaved(); sync(); status('Saved mixes updated on this device.');
      };
      group.append(control);
    }
    $('#saved-mixes').append(group);
  });
}
$('#save-form').onsubmit = event => {
  event.preventDefault(); const name = $('#mix-name').value.trim();
  if (!name || !mix.enabled.length) { status('Choose sounds and give your mix a name first.'); return; }
  if (saved.length >= 20) { status('You have 20 saved mixes. Delete one to make room.'); return; }
  saved.push({ name: name.slice(0, 40), mix: normalize(mix) }); renderSaved(); sync(); $('#mix-name').value = ''; status(`Saved “${name}” on this device.`);
};
$('#add-radio').onclick = () => { $('#radio-form-status').textContent = ''; $('#radio-dialog').showModal(); };
$('#radio-form').onsubmit = async event => {
  event.preventDefault();
  if (!db) return;
  const submit = $('#radio-form button'); submit.disabled = true;
  try {
    const name = $('#radio-name').value.trim();
    if (!name) throw new Error('Give your station a name.');
    const url = normalizeRadioUrl($('#radio-url').value);
    if (catalog.some(sound => sound.kind === 'radio' && sound.url === url)) throw new Error('This station URL is already in your library.');
    if (catalog.filter(sound => sound.kind === 'radio').length >= 20) throw new Error('You have 20 stations. Remove one to make room.');
    const sound = { id: `radio-${crypto.randomUUID()}`, name: name.slice(0, 60), kind: 'radio', category: 'Radio', url };
    await putSound(db, sound); catalog.push(sound); mix = normalize(mix);
    renderSounds(); showView('library'); selectCategory('Radio'); sync();
    $('#radio-dialog').close(); $('#radio-form').reset();
    status(`Saved “${name}”. Select the station and press Play to connect.`);
  } catch (error) { $('#radio-form-status').textContent = error.message; }
  finally { submit.disabled = false; }
};
window.addEventListener('offline', () => { engine.disconnectRadios(); renderRadioStates(); });
window.addEventListener('online', renderRadioStates);
$('#add-sounds').onclick = () => $('#sound-files').click();
async function inspectDuration(file) {
  const url = URL.createObjectURL(file);
  const audio = document.createElement('audio');
  audio.preload = 'metadata';
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { cleanup(); reject(new Error('could not read audio metadata')); }, 15000);
      const cleanup = () => { clearTimeout(timeout); audio.onloadedmetadata = null; audio.onerror = null; };
      audio.onloadedmetadata = () => { cleanup(); Number.isFinite(audio.duration) ? resolve(audio.duration) : reject(new Error('recording duration is unavailable')); };
      audio.onerror = () => { cleanup(); reject(new Error('this audio format is not supported by your browser')); };
      audio.src = url;
    });
  } finally { audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); }
}
$('#sound-files').onchange = async event => {
  if (!db) return;
  $('#add-sounds').disabled = true;
  const files = [...event.target.files]; let imported = 0; const problems = [];
  // A separate decoder never connects imported audio to the speakers.
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  let decoder;
  try {
    decoder = new Context(); await decoder.suspend();
    for (const file of files) {
      try {
        if (catalog.filter(sound => sound.kind === 'custom').length >= 30) throw new Error('30 custom sounds are already stored');
        if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('choose a file below 25 MB');
        if (await inspectDuration(file) > 120) throw new Error('choose a recording of two minutes or less');
        const data = await file.arrayBuffer();
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(byte => byte.toString(16).padStart(2, '0')).join('');
        if (catalog.some(sound => sound.hash === hash)) throw new Error('already in your library');
        const buffer = await decoder.decodeAudioData(data);
        if (buffer.duration > 120) throw new Error('choose a recording of two minutes or less');
        if (buffer.numberOfChannels > 2) throw new Error('choose a mono or stereo recording');
        const sound = { id: `custom-${crypto.randomUUID()}`, name: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'My sound', kind: 'custom', category: 'My sounds', hash, durationSeconds: buffer.duration, blob: file };
        await putSound(db, sound); catalog.push(sound); imported++;
      } catch (error) { problems.push(`${file.name}: ${error.message}`); }
    }
  } catch (error) { problems.push(error.message); }
  finally {
    await decoder?.close(); event.target.value = ''; $('#add-sounds').disabled = false;
    mix = normalize(mix); renderSounds(); sync();
    status(`${imported} recording${imported === 1 ? '' : 's'} added.${problems.length ? ` ${problems[0]}${problems.length > 1 ? ` (${problems.length - 1} other files could not be added.)` : ''}` : ' Ready to play, even offline.'}`);
  }
};
for (const sound of SOUNDS.filter(sound => sound.kind === 'recording')) {
  const entry = document.createElement('div'); entry.className = 'credit';
  const title = document.createElement('strong'); title.textContent = `${sound.name} — ${sound.creator}`;
  const source = document.createElement('a'); source.href = sound.sourceUrl; source.textContent = sound.sourceTitle; source.target = '_blank'; source.rel = 'noopener noreferrer';
  const licence = document.createElement('a'); licence.href = sound.licenseUrl; licence.textContent = sound.license; licence.target = '_blank'; licence.rel = 'noopener noreferrer';
  const details = document.createElement('p'); details.append(source, ' · ', licence);
  const changes = document.createElement('p'); changes.textContent = sound.modifications;
  entry.append(title, details, changes); $('#credits').append(entry);
}
$('#show-credits').onclick = () => $('#credits-dialog').showModal();
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('#install').hidden = false; });
$('#install').onclick = async () => { await installPrompt?.prompt(); installPrompt = null; $('#install').hidden = true; };
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(registration => {
    const check = async () => {
      let ready = false;
      try { ready = Boolean(await caches.match(new URL('./audio/credits.json', location.href), { cacheName: 'openambience-shell-0.3.0-alpha.1' })); } catch {}
      $('#offline').textContent = ready && registration.active ? '● Library ready offline' : 'Preparing offline library…';
      $('#update').hidden = !registration.waiting;
    };
    void check();
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', event => { if (event.target.state === 'redundant') $('#offline').textContent = 'Offline download failed. Reconnect and reload to retry.'; else void check(); }));
    navigator.serviceWorker.ready.then(check);
    $('#update').onclick = async () => { await pause(); registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true }); };
  }).catch(() => { $('#offline').textContent = 'Offline setup unavailable. Reconnect and reload to retry.'; });
}
renderSounds(); renderSaved(); sync();
