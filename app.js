import { SOUNDS, PRESETS, normalizeMix, presetMix, readStore } from './js/state.js';
import { CATEGORIES, FILTER_CATEGORIES, CUSTOM_CATEGORIES, categoryOf, matchesCategory, matchesCategories, normalizeCategories, readCategoryFilters } from './js/categories.js';
import { normalizeRadioUrl } from './js/radio.js';
import { AudioEngine } from './js/audio.js';
import { MixMediaSession } from './js/media-session.js';
import { openLibrary, listSounds, putSound, deleteSound, readLibraryState, commitLibraryState } from './js/storage.js';
import { makeRecipe, mixLink, recipeFromHash, exportMixZip, importMixZip, prepareRestore } from './js/portable-mix.js';

const $ = selector => document.querySelector(selector);
let storage, db;
try { storage = window.localStorage; } catch {}
let catalog = [...SOUNDS];
const status = (message, quiet = false) => {
  $('#status').textContent = message; $('#dialog-status').textContent = message;
  $('#player-notice').classList.toggle('sr-only', quiet);
  $('#dismiss-status').hidden = quiet;
};
$('#dismiss-status').onclick = () => {
  $('#player-notice').classList.add('sr-only');
  $('#dismiss-status').hidden = true;
  $('#play').focus({ preventScroll: true });
};
let storedState;
try { db = await openLibrary(); catalog.push(...await listSounds(db)); storedState = await readLibraryState(db); }
catch (error) { db = undefined; status(`Local storage is unavailable. ${error.message}`); $('#add-sounds').disabled = true; $('#add-radio').disabled = true; }
let { mix, saved } = readStore(storedState ? { getItem: () => JSON.stringify(storedState) } : storage, catalog);
const radioStates = new Map();
const engine = new AudioEngine(id => catalog.find(sound => sound.id === id),
  (id, state) => { radioStates.set(id, state); renderRadioStates(); },
  state => {
    if (playing && state !== 'running') {
      void pause(); status('Audio was interrupted. Press Play to resume your mix.');
    }
  });
let playing = false, busy = false, deadline = 0, installPrompt;
let playbackRevision = 0, sessionStarted = false;
const mediaSession = new MixMediaSession({ play, pause: () => pause(), stop: () => pause(true) });
let selectedCategories = readCategoryFilters(storage);
let lastAudibleVolume = mix.master || 40;
const symbols = { rain: '☂', thunder: 'ϟ', wind: '≋', ocean: '≈', water: '≋', fire: '♨', bird: '♪', moon: '☾', cup: '☕', fan: '✺', cat: '♧' };
const normalize = value => normalizeMix(value, catalog);
function persist() {
  // Do not overwrite recipes with custom IDs if their database could not load.
  if (!db) return;
  void commitLibraryState(db, { schemaVersion: 2, mix, saved }).catch(() => {
    status('Browser storage is full or blocked. Changes will only last for this visit.');
  });
}
function scheduleTimer() { engine.scheduleSleep(deadline ? Math.max(0, (deadline - Date.now()) / 1000) : 0, mix.master); }
let audioUpdating = false, audioDirty = false;
async function updateAudio() {
  if (!mix.enabled.length && busy) { await pause(true); return; }
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
  if (!mix.enabled.length && playing) { void pause(true); return; }
  if (!mix.enabled.length) sessionStarted = false;
  mediaSession.sync(sessionStarted ? mix.enabled.map(id => catalog.find(sound => sound.id === id)?.name).filter(Boolean) : [],
    playing ? 'playing' : sessionStarted && mix.enabled.length ? 'paused' : 'none');
  for (const card of $('#sounds').querySelectorAll('.sound-card')) {
    const id = card.dataset.sound, enabled = mix.enabled.includes(id);
    card.classList.toggle('active', enabled);
    card.querySelector('.sound-toggle').setAttribute('aria-pressed', String(enabled));
    card.querySelector('.indicator').textContent = enabled ? '✓' : '+';
    card.querySelector('input').value = mix.levels[id];
    card.querySelector('output').value = `${mix.levels[id]}%`;
    if (id === 'binaural') card.querySelector('.sound-name').textContent = `Saved binaural ${mix.binauralBeat} Hz`;
  }
  $('#master').value = mix.master;
  $('#timer').value = String(mix.timerMinutes);
  $('#master-value').value = `${mix.master}%`;
  $('#master').setAttribute('aria-valuetext', `${mix.master} percent`);
  $('#master').style.setProperty('--volume', `${mix.master}%`);
  $('#volume-toggle').setAttribute('aria-label', `Volume: ${mix.master}%. Adjust volume`);
  const playLabel = busy ? 'Loading audio' : playing ? 'Pause mix' : 'Play mix';
  $('#play-label').textContent = playLabel;
  $('#play').setAttribute('aria-label', playLabel);
  $('#play').title = playLabel;
  $('#play').setAttribute('aria-busy', String(busy));
  $('#play .play-symbol').toggleAttribute('hidden', playing);
  $('#play .pause-symbol').toggleAttribute('hidden', !playing);
  if (mix.master > 0) lastAudibleVolume = mix.master;
  const muted = mix.master === 0;
  $('#mute').setAttribute('aria-pressed', String(muted));
  $('#mute').setAttribute('aria-label', muted ? 'Unmute volume' : 'Mute volume');
  $('#mute').textContent = muted ? 'Unmute' : 'Mute';
  $('#volume-toggle .volume-waves').toggleAttribute('hidden', muted);
  $('#volume-toggle .volume-cross').toggleAttribute('hidden', !muted);
  $('#play').disabled = busy;
  for (const id of ['open-save', 'save-current', 'share-current']) $(`#${id}`).disabled = !mix.enabled.length;
  $('#play').setAttribute('aria-pressed', String(playing));
  $('#layer-count').textContent = mix.enabled.length ? `${mix.enabled.length} sound${mix.enabled.length === 1 ? '' : 's'} selected` : 'Your quiet starts here';
  if (!deadline) $('#countdown').textContent = playing ? 'Playing your mix' : 'Ready when you are';
  $('#active-names').textContent = mix.enabled.map(id => catalog.find(sound => sound.id === id)?.name).join(' · ') || 'Choose sounds from the library first.';
  $('#sound-total').textContent = catalog.filter(sound => !sound.legacy || mix.enabled.includes(sound.id)).length;
  $('#mix-total').textContent = saved.length;
  filterSounds(); renderRadioStates(); persist();
}
function filterSounds() {
  const query = $('#search').value.trim().toLowerCase();
  const matchesSearch = sound => (!sound.legacy || mix.enabled.includes(sound.id))
    && `${sound.name} ${categoryOf(sound)} ${sound.band || ''} ${sound.description || ''} ${sound.legacy ? mix.binauralBeat : ''}`.toLowerCase().includes(query);
  let count = 0;
  const visibleGroups = new Set();
  for (const card of $('#sounds').querySelectorAll('.sound-card')) {
    const sound = catalog.find(item => item.id === card.dataset.sound);
    card.hidden = !matchesSearch(sound) || !matchesCategories(sound, selectedCategories, mix.enabled);
    if (!card.hidden) { count++; visibleGroups.add(categoryOf(sound)); }
    if (sound.kind === 'binaural') card.querySelector('.sound-toggle').setAttribute('aria-describedby',
      `${selectedCategories.length === 1 ? 'binaural-headphones' : 'binaural-group-headphones'} help-${sound.id}`);
  }
  for (const heading of $('#sounds').querySelectorAll('.sound-group-heading')) heading.hidden = selectedCategories.length === 1 || !visibleGroups.has(heading.dataset.category);
  for (const input of $('#categories').querySelectorAll('input')) {
    input.checked = selectedCategories.includes(input.value);
    input.closest('label').querySelector('.category-count').textContent = catalog.filter(sound => matchesSearch(sound) && matchesCategory(sound, input.value, mix.enabled)).length;
  }
  const category = selectedCategories.length === 1 ? selectedCategories[0] : selectedCategories.length ? 'Filtered sounds' : 'All sounds';
  const summary = selectedCategories.length > 1 ? `${selectedCategories.length} categories` : category;
  $('#filter-summary').textContent = `${summary} · ${count}`;
  $('#filter-summary').title = selectedCategories.join(', ') || 'All sounds';
  $('#filters').classList.toggle('filtered', selectedCategories.length > 0 || Boolean(query));
  $('#empty').hidden = count > 0;
  $('#empty').textContent = query ? 'No sounds match your search and selected filters.' : category === 'Radio' ? 'Add a station using ＋ Radio. Your saved stations will appear here.' : category === 'My sounds' ? 'Choose ＋ Add sounds to import recordings from your device.' : category === 'In your mix' ? 'Select sounds from the library to build your mix.' : 'No sounds match the selected filters yet.';
  $('#visible-count').textContent = `${count} sound${count === 1 ? '' : 's'}`;
  $('#category-heading').textContent = category;
  $('#binaural-headphones').hidden = selectedCategories.length !== 1 || !visibleGroups.has('Binaural beats');
  $('#radio-hint').hidden = !selectedCategories.includes('Radio');
}
function renderRadioStates() {
  for (const card of $('#sounds').querySelectorAll('[data-kind="radio"]')) {
    const state = radioStates.get(card.dataset.sound) || { state: 'idle', message: navigator.onLine === false ? 'Offline · Connect to play this station' : 'Online only · Direct stream' };
    card.querySelector('.radio-state').textContent = state.message;
    card.querySelector('.retry-radio').hidden = !playing || !mix.enabled.includes(card.dataset.sound) || !['error', 'offline'].includes(state.state);
    card.querySelector('.retry-radio').disabled = navigator.onLine === false;
  }
}
function setCategoryFilters(names) {
  selectedCategories = normalizeCategories(names);
  try { storage?.setItem('openambience.categories', JSON.stringify(selectedCategories)); } catch {}
  filterSounds();
}
function renderSounds() {
  $('#sounds').replaceChildren();
  let previousGroup;
  const ordered = [...catalog].sort((a, b) => CATEGORIES.indexOf(categoryOf(a)) - CATEGORIES.indexOf(categoryOf(b))
    || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  for (const sound of ordered) {
    const group = categoryOf(sound);
    if (group !== previousGroup) {
      const heading = document.createElement('h3'); heading.className = 'sound-group-heading'; heading.dataset.category = group; heading.textContent = group;
      if (group === 'Binaural beats') {
        const tag = document.createElement('span'); tag.className = 'headphones-tag'; tag.id = 'binaural-group-headphones'; tag.textContent = 'Stereo headphones';
        heading.append(tag);
      }
      $('#sounds').append(heading); previousGroup = group;
    }
    const card = document.createElement('article');
    card.className = 'sound-card'; card.dataset.sound = sound.id; card.dataset.kind = sound.kind || 'generated';
    // The template contains only project-owned markup. Names use textContent.
    card.innerHTML = '<button class="sound-toggle" aria-pressed="false"><span class="sound-icon" aria-hidden="true"></span><span class="sound-name"></span><span class="indicator" aria-hidden="true">+</span></button><p class="sound-kind"></p><label class="volume-label"><span>Volume</span><output>50%</output></label><input type="range" min="0" max="100" value="50">';
    card.querySelector('.sound-name').textContent = sound.name;
    card.querySelector('.sound-icon').textContent = sound.kind === 'radio' ? '◉' : symbols[sound.icon] || sound.icon || '♫';
    card.querySelector('.sound-kind').textContent = sound.kind === 'radio' ? 'INTERNET RADIO · ONLINE ONLY' : sound.kind === 'custom' ? 'ON THIS DEVICE' : sound.kind === 'recording' ? (sound.mode === 'event' ? 'RECORDING · OCCASIONAL' : 'FIELD RECORDING') : 'GENERATED TEXTURE';
    if (sound.kind === 'custom') {
      const badge = document.createElement('span'); badge.className = 'source-tag'; badge.textContent = 'Uploaded'; badge.title = 'Imported on this device; available offline';
      const category = document.createElement('span'); category.className = 'sound-category'; category.textContent = categoryOf(sound) === 'My sounds' ? 'Uncategorized' : categoryOf(sound);
      card.querySelector('.sound-kind').classList.add('sound-meta');
      card.querySelector('.sound-kind').replaceChildren(badge, category);
    }
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
    if (sound.kind === 'binaural') {
      card.querySelector('.sound-kind').textContent = sound.band ? `${sound.band.toUpperCase()} · GENERATED TONES` : 'GENERATED TONES';
      const description = document.createElement('p'); description.className = 'sound-description';
      description.textContent = sound.description || 'Your saved listening setting.';
      description.id = `help-${sound.id}`;
      card.querySelector('.sound-kind').after(description);
    }
    if (sound.kind === 'radio') {
      const info = document.createElement('p'); info.className = 'radio-state hint'; info.setAttribute('role', 'status');
      const retry = document.createElement('button'); retry.className = 'retry-radio'; retry.textContent = 'Retry station'; retry.hidden = true;
      retry.onclick = () => engine.retryRadio(sound.id);
      card.append(info, retry);
    }
    if (sound.kind === 'custom') {
      const label = document.createElement('label'); label.className = 'custom-category'; label.textContent = 'Category';
      const select = document.createElement('select'); select.setAttribute('aria-label', `${sound.name} category`);
      for (const name of CUSTOM_CATEGORIES) { const option = document.createElement('option'); option.value = name; option.textContent = name === 'My sounds' ? 'Uncategorized' : name; select.append(option); }
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
for (const name of FILTER_CATEGORIES) {
  const label = document.createElement('label'); label.className = 'category-option';
  const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'category'; input.value = name; input.setAttribute('aria-label', name);
  const text = document.createElement('span'); text.className = 'category-name'; text.textContent = name;
  const count = document.createElement('span'); count.className = 'category-count'; count.setAttribute('aria-hidden', 'true');
  label.append(input, text, count); input.onchange = () => setCategoryFilters([...$('#categories').querySelectorAll('input:checked')].map(item => item.value));
  $('#categories').append(label);
}
$('#clear-filters').onclick = () => { $('#search').value = ''; setCategoryFilters([]); };
$('#search').oninput = filterSounds;
function showView(name) {
  $('#library').hidden = name !== 'library'; $('#mixes').hidden = name !== 'mixes';
  $('#library-tab').setAttribute('aria-pressed', String(name === 'library'));
  $('#mixes-tab').setAttribute('aria-pressed', String(name === 'mixes'));
}
$('#library-tab').onclick = () => showView('library');
$('#mixes-tab').onclick = () => showView('mixes');
async function pause(stop = false) {
  ++playbackRevision; playing = false; deadline = 0;
  if (stop || !mix.enabled.length) sessionStarted = false;
  // Publish the pause immediately, including while a recording is decoding.
  const pending = engine.pause(stop || !mix.enabled.length);
  sync();
  try { await pending; } catch (error) { status(`Could not pause audio. ${error.message}`); }
}
async function play() {
  if (busy || playing) return;
  if (!mix.enabled.length) { status('Choose a sound from the library first.'); return; }
  const revision = ++playbackRevision;
  busy = true; sync();
  try {
    await engine.play(normalize(mix));
    if (revision !== playbackRevision) return;
    if (engine.context.state !== 'running') throw new Error('Audio was interrupted. Try Play again.');
    playing = true; sessionStarted = true;
    await updateAudio();
    if (!playing || revision !== playbackRevision) return;
    const minutes = Number($('#timer').value); deadline = minutes ? Date.now() + minutes * 60000 : 0;
    scheduleTimer(); status('Settle in. Your mix is playing.', true);
  } catch (error) { if (revision === playbackRevision) { await pause(); status(`Could not play this mix. ${error.message}`); } }
  finally { busy = false; sync(); }
}
$('#play').onclick = async () => {
  if (busy) return;
  if (playing) { await pause(); status('Paused. Your mix is ready whenever you are.', true); }
  else await play();
};
function setMasterVolume(value) { mix.master = value; sync(); void updateAudio(); }
$('#master').oninput = event => setMasterVolume(Number(event.target.value));
$('#mute').onclick = () => setMasterVolume(mix.master === 0 ? lastAudibleVolume : 0);
function fitVolumePopout() {
  $('#master').style.height = '180px';
  const overflow = Math.max(0, 8 - $('#volume-popout').getBoundingClientRect().top);
  $('#master').style.height = `${Math.max(44, 180 - overflow)}px`;
}
function setVolumeOpen(open, restoreFocus = false) {
  $('#volume-popout').hidden = !open;
  $('#volume-toggle').setAttribute('aria-expanded', String(open));
  if (open) {
    $('#player-notice').classList.add('sr-only'); $('#dismiss-status').hidden = true;
    fitVolumePopout(); $('#master').focus({ preventScroll: true });
  }
  else if (restoreFocus) $('#volume-toggle').focus({ preventScroll: true });
}
$('#volume-toggle').onclick = () => setVolumeOpen($('#volume-popout').hidden);
document.addEventListener('pointerdown', event => {
  if (!$('.volume-control').contains(event.target)) setVolumeOpen(false);
});
$('.volume-control').addEventListener('focusout', event => {
  if (!$('.volume-control').contains(event.relatedTarget)) setVolumeOpen(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#volume-popout').hidden) {
    event.preventDefault(); setVolumeOpen(false, true);
  }
});
window.addEventListener('resize', () => { if (!$('#volume-popout').hidden) fitVolumePopout(); });
new ResizeObserver(() => { if (!$('#volume-popout').hidden) fitVolumePopout(); }).observe($('.player-dock'));
$('#timer').onchange = () => {
  const minutes = Number($('#timer').value); mix.timerMinutes = minutes; deadline = playing && minutes ? Date.now() + minutes * 60000 : 0;
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
$('#reset').onclick = async () => { if (busy) return; await pause(true); mix = normalize(); $('#timer').value = '0'; sync(); status('Mix cleared. A little space to start again.'); };
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close').onclick = () => { if (!dialog.dataset.busy) dialog.close(); };
  dialog.addEventListener('cancel', event => { if (dialog.dataset.busy) event.preventDefault(); });
  dialog.onclick = event => { if (event.target === dialog && !dialog.dataset.busy) { const bounds = dialog.getBoundingClientRect(); if (event.clientY < bounds.top || event.clientY > bounds.bottom || event.clientX < bounds.left || event.clientX > bounds.right) dialog.close(); } };
}
for (const button of document.querySelectorAll('[data-close-dialog]')) button.onclick = () => button.closest('dialog').close();
const openMixer = () => { $('#dialog-status').textContent = ''; $('#mixer-dialog').showModal(); };
function openSave() {
  if (!mix.enabled.length) { status('Choose sounds before saving a mix.'); return; }
  $('#save-status').textContent = '';
  $('#save-summary').textContent = `${mix.enabled.length} sound${mix.enabled.length === 1 ? '' : 's'}${mix.timerMinutes ? ` · ${mix.timerMinutes} minute timer` : ''} · Saved on this device`;
  $('#mixer-dialog').close(); $('#save-dialog').showModal(); $('#mix-name').focus();
}
$('#open-mixer').onclick = openMixer;
$('#save-current').onclick = openSave; $('#open-save').onclick = openSave;
for (const preset of PRESETS) {
  const button = document.createElement('button'); button.className = 'preset'; button.textContent = preset.name;
  const note = document.createElement('small'); note.textContent = preset.note; button.append(note);
  button.onclick = () => { mix = { ...presetMix(preset.levels), master: mix.master, binauralBeat: mix.binauralBeat, timerMinutes: mix.timerMinutes }; mix = normalize(mix); sync(); void updateAudio(); status(`${preset.name} selected.`); };
  $('#presets').append(button);
}
function renderSaved() {
  $('#saved-mixes').replaceChildren(); $('#no-mixes').hidden = saved.length > 0;
  saved.forEach((item, index) => {
    const group = document.createElement('article'); group.className = 'saved-item';
    const heading = document.createElement('h3');
    const button = document.createElement('button'); button.className = 'load-mix'; button.textContent = item.name; button.title = `Load ${item.name}`;
    const load = () => {
      mix = normalize(item.mix); deadline = playing && mix.timerMinutes ? Date.now() + mix.timerMinutes * 60000 : 0;
      sync(); void updateAudio(); status(`${item.name} loaded.`);
    };
    button.onclick = load; heading.append(button);
    const description = document.createElement('p'); description.className = 'saved-description';
    description.textContent = item.mix.enabled.map(id => catalog.find(sound => sound.id === id)?.name).filter(Boolean).join(' · ') || 'No sounds selected';
    const meta = document.createElement('p'); meta.className = 'saved-meta';
    meta.textContent = `${item.mix.enabled.length} sound${item.mix.enabled.length === 1 ? '' : 's'}${item.mix.timerMinutes ? ` · ${item.mix.timerMinutes} min timer` : ''}`;
    const actions = document.createElement('div'); actions.className = 'saved-actions';
    const loadButton = document.createElement('button'); loadButton.className = 'saved-load'; loadButton.textContent = 'Load mix'; loadButton.setAttribute('aria-label', `Load ${item.name}`); loadButton.onclick = load;
    const share = document.createElement('button'); share.className = 'saved-share quiet'; share.textContent = 'Share'; share.setAttribute('aria-label', `Share / download ${item.name}`); share.title = 'Share or download this mix'; share.onclick = () => openTransfer(item);
    const more = document.createElement('button'); more.className = 'saved-more quiet'; more.setAttribute('aria-label', `Manage ${item.name}`); more.setAttribute('aria-haspopup', 'dialog'); more.setAttribute('aria-controls', 'saved-dialog'); more.title = 'Edit or delete this mix';
    more.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
    more.onclick = () => openSaved(item);
    actions.append(loadButton, share, more); group.dataset.index = index;
    group.append(heading, description, meta, actions);
    $('#saved-mixes').append(group);
  });
}
let managedMix, pendingConfirmation;
function openSaved(item) {
  managedMix = item; $('#saved-name').value = item.name; $('#saved-status').textContent = '';
  $('#update-saved').disabled = !mix.enabled.length; $('#saved-dialog').showModal();
}
function focusSaved(item) {
  const index = saved.indexOf(item);
  ($(`#saved-mixes [data-index="${index}"] .saved-more`) || $('#save-current')).focus({ preventScroll: true });
}
$('#rename-form').onsubmit = event => {
  event.preventDefault(); const name = $('#saved-name').value.trim();
  if (!name || !saved.includes(managedMix)) return;
  managedMix.name = name.slice(0, 40); $('#saved-dialog').close();
  renderSaved(); sync(); focusSaved(managedMix); status(`Renamed mix to “${managedMix.name}”.`);
};
$('#duplicate-saved').onclick = () => {
  if (!saved.includes(managedMix)) return;
  if (saved.length >= 20) { $('#saved-status').textContent = 'You have 20 saved mixes. Delete one to make room.'; return; }
  const copy = { name: `${managedMix.name} copy`.slice(0, 40), mix: normalize(managedMix.mix) };
  saved.push(copy); $('#saved-dialog').close(); renderSaved(); sync(); focusSaved(copy); status(`Saved “${copy.name}” on this device.`);
};
function confirmSaved(action) {
  const item = managedMix; if (!saved.includes(item)) return;
  const deleting = action === 'delete';
  if (!deleting && !mix.enabled.length) { $('#saved-status').textContent = 'Choose sounds before replacing a saved mix.'; return; }
  $('#confirm-title').textContent = deleting ? 'Delete saved mix?' : 'Replace saved mix?';
  $('#confirm-description').textContent = deleting
    ? `“${item.name}” will be removed from your saved mixes. Your recordings and current selection will stay in the library.`
    : `Replace the sounds, levels and timer in “${item.name}” with your current mix?`;
  $('#confirm-action').textContent = deleting ? 'Delete mix' : 'Replace mix';
  $('#confirm-action').className = deleting ? 'danger danger-primary' : 'primary';
  pendingConfirmation = () => {
    if (deleting) saved.splice(saved.indexOf(item), 1); else item.mix = normalize(mix);
    renderSaved(); sync();
    if (deleting) ($('#saved-mixes .load-mix') || $('#save-current')).focus({ preventScroll: true }); else focusSaved(item);
    status(deleting ? `Deleted saved mix “${item.name}”.` : `Updated “${item.name}” with your current mix.`);
  };
  $('#saved-dialog').close(); $('#confirm-dialog').showModal();
};
$('#delete-saved').onclick = () => confirmSaved('delete');
$('#update-saved').onclick = () => confirmSaved('update');
$('#confirm-action').onclick = () => {
  const action = pendingConfirmation; pendingConfirmation = undefined;
  $('#confirm-dialog').close(); action?.();
};
$('#confirm-dialog').addEventListener('close', () => {
  if (!pendingConfirmation) return;
  pendingConfirmation = undefined;
  if (saved.includes(managedMix)) openSaved(managedMix);
});
$('#save-form').onsubmit = event => {
  event.preventDefault(); const name = $('#mix-name').value.trim();
  if (!name || !mix.enabled.length) { $('#save-status').textContent = 'Choose sounds and give your mix a name first.'; return; }
  if (saved.length >= 20) { $('#save-status').textContent = 'You have 20 saved mixes. Delete one to make room.'; return; }
  saved.push({ name: name.slice(0, 40), mix: normalize(mix) }); $('#save-dialog').close();
  renderSaved(); sync(); $('#mix-name').value = ''; status(`Saved “${name}” on this device.`);
};

let transferMix, pendingRestore;
function openTransfer(item = { name: $('#mix-name').value.trim() || 'My mix', mix }) {
  if (!item.mix.enabled.length) { status('Choose sounds before sharing or downloading a mix.'); return; }
  transferMix = normalize(item.mix);
  $('#transfer-name').value = item.name;
  $('#share-link').value = ''; $('#share-link-field').hidden = true;
  $('#transfer-status').textContent = '';
  const custom = transferMix.enabled.some(id => catalog.find(sound => sound.id === id)?.kind === 'custom');
  $('#create-link').disabled = custom;
  $('#transfer-help').textContent = custom
    ? 'This mix uses your recordings. Its ZIP includes the audio and settings so you can restore them together on another device.'
    : 'Copy a link to share this mix, or download a ZIP to keep a backup. Links include station names and URLs; radio needs internet.';
  $('#mixer-dialog').close(); $('#transfer-dialog').showModal();
}
$('#share-current').onclick = () => openTransfer();
$('#create-link').onclick = async () => {
  try {
    const link = mixLink(makeRecipe($('#transfer-name').value.trim(), transferMix, catalog), location.href);
    $('#share-link').value = link; $('#share-link-field').hidden = false;
    try { await navigator.clipboard.writeText(link); $('#transfer-status').textContent = 'Link copied. Opening it shows a mix preview; playback starts with Play.'; }
    catch { $('#share-link').focus(); $('#share-link').select(); $('#transfer-status').textContent = 'Copy the selected link to share this mix.'; }
  } catch (error) { $('#transfer-status').textContent = error.message; }
};
$('#download-mix').onclick = async () => {
  const button = $('#download-mix'); button.disabled = true;
  $('#transfer-dialog').dataset.busy = 'true'; $('#transfer-status').textContent = 'Preparing your mix download…';
  try {
    const recipe = makeRecipe($('#transfer-name').value.trim(), transferMix, catalog);
    const blob = await exportMixZip(recipe, catalog), url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url;
    anchor.download = `${recipe.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 60) || 'openambience-mix'}.openambience.zip`;
    document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    $('#transfer-status').textContent = 'ZIP ready. It contains this mix’s settings and all its uploaded recordings. Use Import mix ZIP to restore it.';
  } catch (error) { $('#transfer-status').textContent = error.message; }
  finally { button.disabled = false; delete $('#transfer-dialog').dataset.busy; }
};
function previewRestore(recipe, files, save) {
  pendingRestore = { recipe, files };
  $('#restore-preview').hidden = false;
  $('#restore-name').textContent = recipe.name;
  $('#restore-summary').textContent = `${recipe.mix.enabled.length} sounds · Volume ${recipe.mix.master}% · ${recipe.mix.timerMinutes ? `${recipe.mix.timerMinutes} minute timer` : 'No timer'}`;
  $('#restore-sounds').replaceChildren(...recipe.mix.enabled.map(id => {
    const item = document.createElement('li'), sound = recipe.sounds.find(sound => sound.id === id) || SOUNDS.find(sound => sound.id === id);
    item.textContent = `${sound.name} · ${recipe.mix.levels[id]}%${sound.kind === 'radio' ? ' · Radio, internet required' : sound.kind === 'custom' ? ' · Recording included' : ''}`;
    return item;
  }));
  $('#restore-save').checked = save;
  $('#restore-mix').disabled = !db;
  $('#restore-status').textContent = db ? 'Load when you’re ready. Your current playback will pause.' : 'Local storage is unavailable. Reload with storage enabled to restore this mix.';
}
$('#import-mix').onclick = () => {
  pendingRestore = undefined; $('#mix-zip').value = ''; $('#restore-preview').hidden = true;
  $('#restore-status').textContent = ''; $('#restore-file-field').hidden = false;
  $('#restore-dialog').showModal();
};
$('#mix-zip').onchange = async () => {
  const file = $('#mix-zip').files[0]; if (!file) return;
  pendingRestore = undefined; $('#restore-preview').hidden = true;
  $('#restore-dialog').dataset.busy = 'true'; $('#mix-zip').disabled = true;
  $('#restore-status').textContent = 'Checking your mix ZIP…';
  try { const { recipe, files } = await importMixZip(file); previewRestore(recipe, files, true); }
  catch (error) { $('#restore-status').textContent = error.message; }
  finally { delete $('#restore-dialog').dataset.busy; $('#mix-zip').disabled = false; }
};
$('#restore-mix').onclick = async () => {
  if (!pendingRestore || !db || $('#restore-dialog').dataset.busy) return;
  const { recipe, files } = pendingRestore, save = $('#restore-save').checked;
  $('#restore-dialog').dataset.busy = 'true'; $('#restore-mix').disabled = true; $('#mix-zip').disabled = true;
  $('#restore-status').textContent = 'Checking recordings and restoring your mix…';
  let decoder;
  try {
    if (save && saved.length >= 20) throw new Error('You have 20 saved mixes. Uncheck Save on this device to load, or delete a saved mix first.');
    const currentCatalog = [...SOUNDS, ...await listSounds(db)];
    const prepared = await prepareRestore(recipe, files, currentCatalog, async blob => {
      if (await inspectDuration(blob) > 120) throw new Error('A recording exceeds two minutes.');
      if (!decoder) { const Context = globalThis.AudioContext || globalThis.webkitAudioContext; decoder = new Context(); await decoder.suspend(); }
      let buffer;
      try { buffer = await decoder.decodeAudioData(await blob.arrayBuffer()); }
      catch { throw new Error('A recording cannot be decoded in this browser. Try a browser that supports its audio format.'); }
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 120 || buffer.numberOfChannels > 2) throw new Error('Recordings must be mono/stereo and at most two minutes long.');
      return buffer.duration;
    });
    await pause(true);
    const nextSaved = save ? [...saved, { name: recipe.name, mix: prepared.mix }] : saved;
    await commitLibraryState(db, { schemaVersion: 2, mix: prepared.mix, saved: nextSaved }, prepared.additions);
    catalog = [...currentCatalog, ...prepared.additions]; mix = prepared.mix; saved = nextSaved;
    renderSounds(); renderSaved(); $('#search').value = ''; setCategoryFilters(['In your mix']); showView('library'); sync();
    $('#restore-dialog').close(); pendingRestore = undefined;
    status(`“${recipe.name}” restored${save ? ' and saved on this device' : ''}. Press Play when you’re ready.`);
  } catch (error) { $('#restore-status').textContent = `Could not restore this mix. ${error.message} Your library and saved mixes have been kept.`; }
  finally {
    if (decoder) await decoder.close().catch(() => {});
    delete $('#restore-dialog').dataset.busy; $('#restore-mix').disabled = false; $('#mix-zip').disabled = false;
  }
};
function previewLink() {
  try {
    const recipe = recipeFromHash(location.hash); if (!recipe) return;
    if ($('#restore-dialog').dataset.busy) { status('Finish the current import, then open the shared link again.'); return; }
    $('#restore-file-field').hidden = true; previewRestore(recipe, undefined, false);
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    $('#restore-dialog').showModal();
  } catch (error) { status(error.message); }
}
window.addEventListener('hashchange', previewLink);
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
    renderSounds(); showView('library'); setCategoryFilters(['Radio']); sync();
    $('#radio-dialog').close(); $('#radio-form').reset();
    status(`Saved “${name}”. Select the station and press Play to connect.`);
  } catch (error) { $('#radio-form-status').textContent = error.message; }
  finally { submit.disabled = false; }
};
window.addEventListener('offline', () => { engine.disconnectRadios(); renderRadioStates(); });
window.addEventListener('online', renderRadioStates);
for (const name of CUSTOM_CATEGORIES) {
  const option = document.createElement('option'); option.value = name; option.textContent = name === 'My sounds' ? 'Uncategorized' : name;
  $('#upload-category').append(option);
}
$('#add-sounds').onclick = () => {
  $('#upload-form').reset(); $('#import-status').textContent = '';
  // Suggest the current genre when browsing one category; other views start uncategorized.
  $('#upload-category').value = selectedCategories.length === 1 && CUSTOM_CATEGORIES.includes(selectedCategories[0]) ? selectedCategories[0] : 'My sounds';
  $('#upload-dialog').showModal();
};
async function inspectDuration(file) {
  const url = URL.createObjectURL(file);
  const audio = document.createElement('audio');
  audio.preload = 'metadata';
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { cleanup(); reject(new Error('could not read audio metadata')); }, 15000);
      const cleanup = () => { clearTimeout(timeout); audio.onloadedmetadata = null; audio.onerror = null; };
      audio.onloadedmetadata = () => { cleanup(); Number.isFinite(audio.duration) ? resolve(audio.duration) : reject(new Error('recording duration is unavailable')); };
      audio.onerror = () => { cleanup(); reject(new Error('not readable audio or a format this browser supports; try MP3 or WAV')); };
      audio.src = url;
    });
  } finally { audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); }
}
$('#upload-form').onsubmit = async event => {
  event.preventDefault();
  if (!db || $('#import-submit').disabled) return;
  const files = [...$('#sound-files').files];
  if (!files.length) { $('#import-status').textContent = 'Choose at least one audio file.'; return; }
  const category = CUSTOM_CATEGORIES.includes($('#upload-category').value) ? $('#upload-category').value : 'My sounds';
  for (const id of ['add-sounds', 'import-submit', 'sound-files', 'upload-category']) $(`#${id}`).disabled = true;
  $('#import-submit').textContent = 'Adding…'; $('#import-status').textContent = 'Checking your recordings…';
  let imported = 0; const problems = [];
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
        // Validate the content, since file names and MIME types are not reliable.
        let buffer;
        try { buffer = await decoder.decodeAudioData(data); }
        catch { throw new Error('could not decode this recording; it may be damaged or unsupported; try MP3 or WAV'); }
        if (buffer.duration > 120) throw new Error('choose a recording of two minutes or less');
        if (buffer.numberOfChannels > 2) throw new Error('choose a mono or stereo recording');
        const sound = { id: `custom-${crypto.randomUUID()}`, name: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'My sound', kind: 'custom', category, hash, durationSeconds: buffer.duration, blob: file };
        await putSound(db, sound); catalog.push(sound); imported++;
      } catch (error) { problems.push(`${file.name}: ${error.message}`); }
    }
  } catch (error) { problems.push(error.message); }
  finally {
    await decoder?.close();
    for (const id of ['add-sounds', 'import-submit', 'sound-files', 'upload-category']) $(`#${id}`).disabled = false;
    $('#import-submit').textContent = 'Add to library';
    mix = normalize(mix); renderSounds();
    if (imported) { showView('library'); $('#search').value = ''; setCategoryFilters([category]); }
    sync();
    const message = `${imported} recording${imported === 1 ? '' : 's'} added.${problems.length ? ` ${problems[0]}${problems.length > 1 ? ` (${problems.length - 1} other files could not be added.)` : ''}` : ' Tagged Uploaded and ready offline.'}`;
    $('#import-status').textContent = message; status(message);
    if (imported && !problems.length) { $('#upload-dialog').close(); $('#upload-form').reset(); }

  }
};
for (const sound of SOUNDS.filter(sound => sound.kind === 'recording')) {
  const entry = document.createElement('div'); entry.className = 'credit';
  const title = document.createElement('strong'); title.textContent = `${sound.name} — ${sound.creator}`;
  const source = document.createElement('a'); source.href = sound.sourceUrl; source.textContent = sound.sourceTitle; source.target = '_blank'; source.rel = 'noopener noreferrer';
  const licence = document.createElement('a'); licence.href = sound.licenseUrl; licence.textContent = sound.license; licence.target = '_blank'; licence.rel = 'noopener noreferrer';
  const details = document.createElement('p'); details.append(source, ' · ', licence);
  const changes = document.createElement('p'); changes.textContent = sound.modifications;
  entry.append(title, details, changes);
  if (sound.attributionText) { const attribution = document.createElement('p'); attribution.textContent = sound.attributionText; entry.append(attribution); }
  $('#credits').append(entry);
}
$('#show-credits').onclick = () => $('#credits-dialog').showModal();
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('#install').hidden = false; });
$('#install').onclick = async () => { await installPrompt?.prompt(); installPrompt = null; $('#install').hidden = true; };
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(registration => {
    let dismissedUpdate, applyingUpdate = false, offlineCheck = 0;
    const renderUpdate = () => {
      const waiting = registration.waiting;
      const deferred = waiting && waiting === dismissedUpdate;
      $('#update-notice').hidden = !waiting || Boolean(deferred);
      $('#show-update').hidden = !deferred;
      $('#update').disabled = applyingUpdate;
      $('#defer-update').disabled = applyingUpdate;
      $('#update').textContent = applyingUpdate ? 'Updating…' : 'Update & reload';
    };
    const check = async () => {
      renderUpdate();
      const attempt = ++offlineCheck;
      const worker = navigator.serviceWorker.controller || registration.active;
      if (!worker) return;
      // Ask the worker serving this page; its cache version may differ from the page's.
      const ready = await new Promise(resolve => {
        const channel = new MessageChannel();
        const finish = value => { clearTimeout(timeout); channel.port1.close(); channel.port2.close(); resolve(value); };
        const timeout = setTimeout(() => finish(null), 5000);
        channel.port1.onmessage = event => finish(event.data?.ready === true);
        try { worker.postMessage({ type: 'OFFLINE_STATUS' }, [channel.port2]); }
        catch { finish(null); }
      });
      if (attempt !== offlineCheck) return;
      $('#offline').textContent = ready === true ? '● Library ready offline'
        : ready === false ? 'Offline library incomplete. Reconnect and reload to retry.'
          : 'Offline status unavailable. Reconnect and reload to retry.';
    };
    void check();
    const watchInstall = () => registration.installing?.addEventListener('statechange', event => {
      if (event.target.state === 'redundant') { offlineCheck++; $('#offline').textContent = 'Offline download failed. Reconnect and reload to retry.'; }
      else void check();
    });
    watchInstall();
    registration.addEventListener('updatefound', watchInstall);
    navigator.serviceWorker.ready.then(check);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (applyingUpdate) location.reload();
      else void check();
    });
    $('#defer-update').onclick = () => {
      dismissedUpdate = registration.waiting; renderUpdate();
      if (!$('#show-update').hidden) $('#show-update').focus({ preventScroll: true });
    };
    $('#show-update').onclick = () => {
      dismissedUpdate = undefined; renderUpdate();
      if (!$('#update-notice').hidden) $('#update').focus();
    };
    $('#update').onclick = async () => {
      const waiting = registration.waiting;
      if (!waiting || applyingUpdate) { renderUpdate(); return; }
      applyingUpdate = true; $('#update-feedback').textContent = ''; renderUpdate();
      try {
        await pause();
        // Another tab may have activated it while audio was pausing.
        if (registration.waiting !== waiting) { applyingUpdate = false; renderUpdate(); return; }
        waiting.postMessage({ type: 'SKIP_WAITING' });
      } catch {
        applyingUpdate = false; renderUpdate();
        $('#update-feedback').textContent = 'Could not update just now. Please try again when you’re ready.';
      }
    };
  }).catch(() => { $('#offline').textContent = 'Offline setup unavailable. Reconnect and reload to retry.'; });
} else {
  $('#offline').textContent = 'Offline listening is unavailable in this browser.';
}
renderSounds(); renderSaved(); sync();
previewLink();
