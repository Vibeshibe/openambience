import { SOUNDS, PRESETS, normalizeMix, presetMix, readStore } from './js/state.js';
import { CATEGORIES, FILTER_CATEGORIES, CUSTOM_CATEGORIES, categoryOf, matchesCategory, matchesCategories, normalizeCategories, readCategoryFilters } from './js/categories.js';
import { normalizeRadioUrl } from './js/radio.js';
import { AudioEngine } from './js/audio.js';
import { MixMediaSession } from './js/media-session.js';
import { openLibrary, listSounds, putSound, readLibraryState, commitLibraryState, removeSoundAndReferences } from './js/storage.js';
import { makeRecipe, mixLink, recipeFromHash, exportMixZip, exportMixesZip, importMixArchive, prepareRestore, prepareCollectionRestore } from './js/portable-mix.js';
import { createFeedback } from './js/feedback.js';
import { classifyFiles, installFileDrop } from './js/file-import.js';
import { soundUsage, usageSignature, formatBytes, inspectStorage } from './js/library-management.js';

const $ = selector => document.querySelector(selector);
let storage, db;
try { storage = window.localStorage; } catch {}
let catalog = [...SOUNDS];
let libraryBusy = false, exportingMixes = false;
const feedback = createFeedback($('#player-notice'), { mirror: $('#dialog-status'), fallbackFocus: $('#play') });
const status = (message, quiet = false) => feedback.status(message, { quiet });
function announceMix(action, name, detail = '') {
  feedback.success(`${action} “${name}”.${detail ? ` ${detail}` : ''}`);
}
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
  if (!db || libraryBusy) return;
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
    card.innerHTML = '<button class="sound-toggle" aria-pressed="false"><span class="sound-icon" aria-hidden="true"></span><span class="sound-name"></span><span class="indicator" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path class="indicator-add" d="M12 5v14M5 12h14"/><path class="indicator-check" d="m5 12 4 4L19 6"/></svg></span></button><p class="sound-kind"></p><label class="volume-label"><span>Volume</span><output>50%</output></label><input type="range" min="0" max="100" value="50">';
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
      remove.onclick = () => openSoundRemoval(sound);
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
    feedback.hide();
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
$('#reset').onclick = async () => { if (busy) return; await pause(true); mix = normalize(); $('#timer').value = '0'; sync(); feedback.success('Mix cleared. A little space to start again.'); };
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close').onclick = () => { if (!dialog.dataset.busy) dialog.close(); };
  dialog.addEventListener('cancel', event => { if (dialog.dataset.busy) event.preventDefault(); });
  dialog.onclick = event => { if (event.target === dialog && !dialog.dataset.busy) { const bounds = dialog.getBoundingClientRect(); if (event.clientY < bounds.top || event.clientY > bounds.bottom || event.clientX < bounds.left || event.clientX > bounds.right) dialog.close(); } };
}
for (const button of document.querySelectorAll('[data-close-dialog]')) button.onclick = () => { const dialog = button.closest('dialog'); if (!dialog.dataset.busy) dialog.close(); };

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function renderStorageRecordings() {
  const recordings = catalog.filter(sound => sound.kind === 'custom').sort((a, b) => a.name.localeCompare(b.name));
  $('#recording-usage').textContent = formatBytes(recordings.reduce((sum, sound) => sum + (sound.blob?.size || 0), 0));
  $('#recording-slots').textContent = `${recordings.length} / 30`;
  $('#storage-empty').hidden = recordings.length > 0; $('#storage-recordings').replaceChildren();
  for (const sound of recordings) {
    const row = document.createElement('article'); row.className = 'storage-recording';
    const name = document.createElement('h4'); name.textContent = sound.name;
    const meta = document.createElement('p'); meta.className = 'hint';
    meta.textContent = `${formatBytes(sound.blob?.size || 0)} · ${Math.round(sound.durationSeconds || 0)} sec · ${categoryOf(sound)}`;
    const usage = soundUsage({ mix, saved }, sound.id), references = document.createElement('p'); references.className = 'hint';
    references.textContent = `${usage.current ? 'In your current mix · ' : ''}${usage.saved.length ? `${usage.saved.length} saved mix${usage.saved.length === 1 ? '' : 'es'}` : 'No saved mix references'}`;
    row.append(name, meta, references);
    if (usage.saved.length) {
      const details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
      summary.textContent = 'Show saved mixes'; list.className = 'reference-list';
      for (const value of usage.saved) { const item = document.createElement('li'); item.textContent = value; list.append(item); }
      details.append(summary, list); row.append(details);
    }
    const actions = document.createElement('div'); actions.className = 'storage-recording-actions';
    const download = document.createElement('button'); download.textContent = 'Download'; download.className = 'quiet'; download.setAttribute('aria-label', `Download recording ${sound.name}`); download.disabled = !sound.blob;
    download.onclick = () => {
      const extension = /mpeg/.test(sound.blob.type) ? 'mp3' : /wav/.test(sound.blob.type) ? 'wav' : /ogg/.test(sound.blob.type) ? 'ogg' : /flac/.test(sound.blob.type) ? 'flac' : /mp4|m4a/.test(sound.blob.type) ? 'm4a' : /aac/.test(sound.blob.type) ? 'aac' : /webm/.test(sound.blob.type) ? 'webm' : 'audio';
      const filename = sound.blob.name || `${sound.name}.${extension}`;
      downloadBlob(sound.blob, filename.replace(/[\\/:*?"<>|]/g, '-').slice(0, 120));
    };
    const remove = document.createElement('button'); remove.textContent = 'Remove'; remove.className = 'danger quiet'; remove.setAttribute('aria-label', `Remove recording ${sound.name}`); remove.onclick = () => openSoundRemoval(sound);
    actions.append(download, remove); row.append(actions); $('#storage-recordings').append(row);
  }
}
async function refreshStorage() {
  renderStorageRecordings();
  $('#storage-estimate').textContent = 'Checking browser storage…';
  const info = await inspectStorage(navigator.storage);
  $('#storage-estimate').textContent = info.usage !== undefined && info.quota !== undefined
    ? `This site uses approximately ${formatBytes(info.usage)} of a ${formatBytes(info.quota)} browser allowance, including app files and offline audio.`
    : 'This browser does not provide a storage estimate. Recording sizes above are available locally.';
  $('#storage-protection-status').textContent = info.persistent === true ? 'Offline data has browser retention protection. Clearing site data still removes it.'
    : info.persistent === false ? 'The browser may clear offline data when space is low.' : 'This browser does not report offline-data retention protection.';
  $('#persist-storage').hidden = typeof navigator.storage?.persist !== 'function';
  $('#persist-storage').disabled = info.persistent === true;
  $('#persist-storage').textContent = info.persistent === true ? 'Protection enabled' : 'Keep offline data';
}
function openStorage(message = '') {
  $('#storage-status').textContent = db ? message : 'Local recording storage is unavailable. Reload with storage enabled to manage recordings.';
  $('#storage-dialog').showModal(); void refreshStorage();
}
$('#manage-storage').onclick = () => openStorage();
$('#upload-manage-storage').onclick = () => { if (!$('#upload-dialog').dataset.busy) { $('#upload-dialog').close(); openStorage(); } };
$('#refresh-storage').onclick = () => { $('#storage-status').textContent = ''; void refreshStorage(); };
$('#persist-storage').onclick = async () => {
  $('#persist-storage').disabled = true;
  try {
    const granted = await navigator.storage.persist();
    await refreshStorage();
    $('#storage-status').textContent = granted ? 'Retention protection enabled. Keep ZIP backups as well.' : 'The browser did not grant retention protection. Your recordings are still available; keep ZIP backups.';
  } catch { $('#storage-status').textContent = 'Could not request retention protection. Your existing data is unchanged.'; $('#persist-storage').disabled = false; }
};
let removalContext;
function openSoundRemoval(sound) {
  const usage = soundUsage({ mix, saved }, sound.id), inUse = usage.current || usage.saved.length > 0;
  removalContext = { sound, expected: { usage: usageSignature({ mix, saved }, sound.id),
    state: JSON.stringify({ schemaVersion: 2, mix, saved }), identity: sound.hash || sound.url }, returnStorage: $('#storage-dialog').open };
  const radio = sound.kind === 'radio';
  $('#remove-sound-title').textContent = radio ? 'Remove station?' : 'Remove recording?';
  $('#confirm-remove-sound').textContent = radio ? 'Remove station' : 'Remove recording';
  $('#remove-sound-description').textContent = `“${sound.name}”${radio ? '' : ` (${formatBytes(sound.blob?.size || 0)})`} will be removed from this device.${inUse ? ' Review the affected mixes below; their other sounds and settings will be kept.' : ' No mix uses it.'}${usage.current || busy ? ' Current playback will pause.' : ''}`;
  $('#remove-sound-usage').replaceChildren();
  for (const name of [...(usage.current ? ['Current mix'] : []), ...usage.saved]) { const item = document.createElement('li'); item.textContent = name; $('#remove-sound-usage').append(item); }
  $('#remove-sound-usage').hidden = !inUse; $('#remove-references-field').hidden = !inUse;
  $('#remove-references').checked = false; $('#confirm-remove-sound').disabled = Boolean(inUse);
  $('#remove-sound-status').textContent = '';
  $('#storage-dialog').close(); $('#remove-sound-dialog').showModal();
}
$('#remove-references').onchange = () => { $('#confirm-remove-sound').disabled = !$('#remove-references').checked; };
$('#remove-sound-dialog').addEventListener('close', () => {
  const context = removalContext; removalContext = undefined;
  if (context?.returnStorage) openStorage();
});
$('#confirm-remove-sound').onclick = async () => {
  if (!removalContext || !db || libraryBusy) return;
  const context = removalContext, { sound } = context;
  libraryBusy = true; $('#remove-sound-dialog').dataset.busy = 'true';
  $('#confirm-remove-sound').disabled = true; $('#remove-references').disabled = true;
  $('#remove-sound-status').textContent = 'Removing…';
  try {
    if (mix.enabled.includes(sound.id) || busy) await pause(true);
    const next = await removeSoundAndReferences(db, sound.id, context.expected);
    engine.remove(sound.id); catalog = catalog.filter(item => item.id !== sound.id);
    mix = normalize(next.mix); saved = next.saved.map(item => ({ ...item, mix: normalize(item.mix) }));
    libraryBusy = false; renderSounds(); renderSaved(); sync();
    removalContext = undefined; $('#remove-sound-dialog').close();
    if (context.returnStorage) openStorage(`Removed “${sound.name}”. Affected mix layers were updated.`);
    else { $('#manage-storage').focus({ preventScroll: true }); feedback.success(`Removed “${sound.name}”.`); }
  } catch (error) { $('#remove-sound-status').textContent = `Could not remove this sound. ${error.message} Your library and saved mixes have been kept.`; }
  finally {
    libraryBusy = false; delete $('#remove-sound-dialog').dataset.busy;
    $('#remove-references').disabled = false;
    $('#confirm-remove-sound').disabled = !$('#remove-references-field').hidden && !$('#remove-references').checked;
  }
};
const openMixer = () => { $('#dialog-status').textContent = ''; $('#mixer-dialog').showModal(); };
function openSave() {
  if (!mix.enabled.length) { status('Choose sounds before saving a mix.'); return; }
  $('#save-status').textContent = '';
  $('#save-summary').textContent = `${mix.enabled.length} sound${mix.enabled.length === 1 ? '' : 's'}${mix.timerMinutes ? ` · ${mix.timerMinutes} minute timer` : ''} · Saved on this device`;
  $('#mixer-dialog').close(); $('#save-dialog').showModal(); $('#mix-name').focus();
}
$('#open-mixer').onclick = openMixer;
$('#save-current').onclick = openSave; $('#open-save').onclick = openSave;
function loadMix(rawMix, name, { restartTimer = true } = {}) {
  mix = normalize(rawMix);
  if (restartTimer) deadline = playing && mix.timerMinutes ? Date.now() + mix.timerMinutes * 60000 : 0;
  sync(); void checkTimer(); announceMix('Loaded', name); void updateAudio();
}
for (const preset of PRESETS) {
  const button = document.createElement('button'); button.className = 'preset'; button.textContent = preset.name;
  const note = document.createElement('small'); note.textContent = preset.note; button.append(note);
  button.onclick = () => loadMix({ ...presetMix(preset.levels), master: mix.master, binauralBeat: mix.binauralBeat, timerMinutes: mix.timerMinutes }, preset.name, { restartTimer: false });
  $('#presets').append(button);
}
function renderSaved() {
  $('#saved-mixes').replaceChildren(); $('#no-mixes').hidden = saved.length > 0;
  $('#download-all-mixes').disabled = !db || !saved.length || exportingMixes;
  $('#download-all-mixes').title = !db ? 'Reload with local storage enabled before downloading your saved mixes.' : !saved.length ? 'Save a mix to include it in a download.' : 'Download every saved mix and its recordings in one ZIP';
  saved.forEach((item, index) => {
    const group = document.createElement('article'); group.className = 'saved-item';
    const heading = document.createElement('h3');
    const button = document.createElement('button'); button.className = 'load-mix'; button.textContent = item.name; button.title = `Load ${item.name}`;
    const load = () => loadMix(item.mix, item.name);
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
  renderSaved(); sync(); focusSaved(managedMix); announceMix('Renamed', managedMix.name);
};
$('#duplicate-saved').onclick = () => {
  if (!saved.includes(managedMix)) return;
  if (saved.length >= 20) { $('#saved-status').textContent = 'You have 20 saved mixes. Delete one to make room.'; return; }
  const copy = { name: `${managedMix.name} copy`.slice(0, 40), mix: normalize(managedMix.mix) };
  saved.push(copy); $('#saved-dialog').close(); renderSaved(); sync(); focusSaved(copy); announceMix('Copied', copy.name);
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
    announceMix(deleting ? 'Deleted' : 'Updated', item.name);
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
  renderSaved(); sync(); $('#mix-name').value = ''; announceMix('Saved', name);
};

let transferMix, pendingRestore;
$('#restore-dialog').addEventListener('close', () => {
  if ($('#restore-dialog').open) return;
  pendingRestore = undefined; $('#mix-zip').value = ''; $('#restore-collection-list').replaceChildren();
});
$('#download-all-mixes').onclick = async () => {
  if (!db || !saved.length || exportingMixes) return;
  const count = saved.length, button = $('#download-all-mixes');
  exportingMixes = true; button.disabled = true; button.textContent = 'Preparing ZIP…';
  $('#mixes-transfer-status').textContent = `Preparing ${count} saved mix${count === 1 ? '' : 'es'} and their recordings…`;
  try {
    const blob = await exportMixesZip(saved, catalog);
    downloadBlob(blob, `openambience-mixes-${new Date().toISOString().slice(0, 10)}.zip`);
    $('#mixes-transfer-status').textContent = `ZIP ready: ${count} saved mix${count === 1 ? '' : 'es'}, with shared recordings included once. Use Import mix ZIP to restore it.`;
  } catch (error) { $('#mixes-transfer-status').textContent = error.message; }
  finally { exportingMixes = false; button.textContent = 'Download all mixes'; button.disabled = !db || !saved.length; }
};
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
    const blob = await exportMixZip(recipe, catalog);
    downloadBlob(blob, `${recipe.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 60) || 'openambience-mix'}.openambience.zip`);
    $('#transfer-status').textContent = 'ZIP ready. It contains this mix’s settings and all its uploaded recordings. Use Import mix ZIP to restore it.';
  } catch (error) { $('#transfer-status').textContent = error.message; }
  finally { button.disabled = false; delete $('#transfer-dialog').dataset.busy; }
};
function previewRestore(recipe, files, save) {
  pendingRestore = { recipe, files };
  $('#restore-collection').hidden = true; $('#restore-title').textContent = 'Restore a mix';
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
function updateCollectionSelection() {
  if (!pendingRestore?.collection) return;
  const count = $('#restore-collection-list').querySelectorAll('input:checked').length, room = Math.max(0, 20 - saved.length);
  $('#restore-collection-summary').textContent = `${count} of ${pendingRestore.collection.mixes.length} mixes selected. Room for ${room} more saved mix${room === 1 ? '' : 'es'} on this device.`;
  $('#restore-selected-mixes').disabled = !db || !count || count > room || !!$('#restore-dialog').dataset.busy;
}
function previewCollection(collection, files) {
  pendingRestore = { collection, files };
  $('#restore-preview').hidden = true; $('#restore-collection').hidden = false;
  $('#restore-title').textContent = 'Import saved mixes';
  $('#restore-collection-list').replaceChildren(...collection.mixes.map((recipe, index) => {
    const label = document.createElement('label'); label.className = 'collection-mix';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = String(index); input.checked = true;
    const text = document.createElement('span'), name = document.createElement('strong'), summary = document.createElement('small');
    name.textContent = recipe.name;
    summary.textContent = `${recipe.mix.enabled.length} sounds · Volume ${recipe.mix.master}% · ${recipe.mix.timerMinutes ? `${recipe.mix.timerMinutes} minute timer` : 'No timer'}`;
    const sounds = document.createElement('small');
    sounds.textContent = recipe.mix.enabled.map(id => (recipe.sounds.find(sound => sound.id === id) || SOUNDS.find(sound => sound.id === id)).name).join(', ') || 'Empty mix';
    text.append(name, summary, sounds); label.append(input, text); return label;
  }));
  $('#restore-status').textContent = 'Choose the mixes to add. Importing does not start or interrupt playback.';
  updateCollectionSelection();
}
$('#restore-collection-list').onchange = updateCollectionSelection;
for (const [id, checked] of [['select-all-mixes', true], ['select-no-mixes', false]]) {
  $(`#${id}`).onclick = () => {
    if ($('#restore-dialog').dataset.busy) return;
    for (const input of $('#restore-collection-list').querySelectorAll('input')) input.checked = checked;
    updateCollectionSelection();
  };
}
function openMixImport() {
  pendingRestore = undefined; $('#mix-zip').value = ''; $('#restore-preview').hidden = true; $('#restore-collection').hidden = true;
  $('#restore-title').textContent = 'Restore a mix';
  $('#restore-status').textContent = ''; $('#restore-file-field').hidden = false;
  $('#restore-dialog').showModal();
}
$('#import-mix').onclick = openMixImport;
async function inspectMixFile(file) {
  pendingRestore = undefined; $('#restore-preview').hidden = true; $('#restore-collection').hidden = true;
  $('#restore-dialog').dataset.busy = 'true'; $('#mix-zip').disabled = true;
  $('#restore-status').textContent = 'Checking your mix ZIP…';
  try {
    const { recipe, collection, files } = await importMixArchive(file);
    if (collection) previewCollection(collection, files); else previewRestore(recipe, files, true);
  }
  catch (error) { $('#restore-status').textContent = error.message; }
  finally { delete $('#restore-dialog').dataset.busy; $('#mix-zip').disabled = false; updateCollectionSelection(); }
}
$('#mix-zip').onchange = () => { const file = $('#mix-zip').files[0]; if (file) void inspectMixFile(file); };
function restoreAudioInspector() {
  let decoder;
  return {
    async inspect(blob) {
      if (await inspectDuration(blob) > 120) throw new Error('A recording exceeds two minutes.');
      if (!decoder) { const Context = globalThis.AudioContext || globalThis.webkitAudioContext; decoder = new Context(); await decoder.suspend(); }
      let buffer;
      try { buffer = await decoder.decodeAudioData(await blob.arrayBuffer()); }
      catch { throw new Error('A recording cannot be decoded in this browser. Try a browser that supports its audio format.'); }
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 120 || buffer.numberOfChannels > 2) throw new Error('Recordings must be mono/stereo and at most two minutes long.');
      return buffer.duration;
    },
    async close() { if (decoder) await decoder.close().catch(() => {}); },
  };
}
$('#restore-selected-mixes').onclick = async () => {
  if (!pendingRestore?.collection || !db || libraryBusy || $('#restore-dialog').dataset.busy) return;
  const { collection, files } = pendingRestore;
  const indices = [...$('#restore-collection-list').querySelectorAll('input:checked')].map(input => Number(input.value));
  libraryBusy = true; $('#restore-dialog').dataset.busy = 'true'; $('#mix-zip').disabled = true;
  $('#restore-selected-mixes').disabled = true; $('#restore-collection-list').disabled = true;
  $('#select-all-mixes').disabled = true; $('#select-no-mixes').disabled = true;
  $('#restore-status').textContent = 'Checking recordings and importing selected mixes…';
  const audio = restoreAudioInspector();
  try {
    const localState = { schemaVersion: 2, mix, saved }, expectedState = await readLibraryState(db), localSounds = await listSounds(db);
    if (JSON.stringify(localState) !== JSON.stringify(expectedState)) throw new Error('Your settings changed in another tab. Reload before importing.');
    const currentCatalog = [...SOUNDS, ...localSounds];
    const prepared = await prepareCollectionRestore(collection, indices, files, currentCatalog, audio.inspect, saved.length);
    const nextCatalog = [...currentCatalog, ...prepared.additions], nextMix = normalizeMix(mix, nextCatalog);
    const nextSaved = [...saved, ...prepared.mixes];
    await commitLibraryState(db, { schemaVersion: 2, mix: nextMix, saved: nextSaved }, prepared.additions,
      { expected: { state: expectedState, sounds: localSounds } });
    catalog = nextCatalog; mix = nextMix; saved = nextSaved;
    renderSounds(); renderSaved(); showView('mixes'); sync();
    $('#restore-dialog').close(); pendingRestore = undefined;
    feedback.success(`Imported ${prepared.mixes.length} saved mix${prepared.mixes.length === 1 ? '' : 'es'}. Existing mixes and playback kept.`);
  } catch (error) { $('#restore-status').textContent = `Could not import these mixes. ${error.message} Your library and saved mixes have been kept.`; }
  finally {
    libraryBusy = false;
    delete $('#restore-dialog').dataset.busy; $('#mix-zip').disabled = false; $('#restore-collection-list').disabled = false;
    $('#select-all-mixes').disabled = false; $('#select-no-mixes').disabled = false;
    updateCollectionSelection();
    await audio.close();
  }
};
$('#restore-mix').onclick = async () => {
  if (!pendingRestore?.recipe || !db || $('#restore-dialog').dataset.busy) return;
  const { recipe, files } = pendingRestore, save = $('#restore-save').checked;
  $('#restore-dialog').dataset.busy = 'true'; $('#restore-mix').disabled = true; $('#mix-zip').disabled = true;
  $('#restore-status').textContent = 'Checking recordings and restoring your mix…';
  const audio = restoreAudioInspector();
  try {
    if (save && saved.length >= 20) throw new Error('You have 20 saved mixes. Uncheck Save on this device to load, or delete a saved mix first.');
    const currentCatalog = [...SOUNDS, ...await listSounds(db)];
    const prepared = await prepareRestore(recipe, files, currentCatalog, audio.inspect);
    await pause(true);
    const nextSaved = save ? [...saved, { name: recipe.name, mix: prepared.mix }] : saved;
    await commitLibraryState(db, { schemaVersion: 2, mix: prepared.mix, saved: nextSaved }, prepared.additions);
    catalog = [...currentCatalog, ...prepared.additions]; mix = prepared.mix; saved = nextSaved;
    renderSounds(); renderSaved(); $('#search').value = ''; setCategoryFilters(['In your mix']); showView('library'); sync();
    $('#restore-dialog').close(); pendingRestore = undefined;
    announceMix('Loaded', recipe.name, `${save ? 'Saved on this device. ' : ''}Ready to play.`);
  } catch (error) { $('#restore-status').textContent = `Could not restore this mix. ${error.message} Your library and saved mixes have been kept.`; }
  finally {
    await audio.close();
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
let selectedAudioFiles = [], fileRouting = false;
function selectAudioFiles(files) {
  selectedAudioFiles = Array.from(files);
  $('#upload-selection').textContent = selectedAudioFiles.length ? `${selectedAudioFiles.length} selected: ${selectedAudioFiles.map(file => file.name).join(', ')}` : 'You can also drop audio files here.';
}
function openAudioImport(files = []) {
  $('#upload-form').reset(); $('#import-status').textContent = '';
  $('#import-problems').replaceChildren(); $('#import-problems').hidden = true;
  // Suggest the current genre when browsing one category; other views start uncategorized.
  $('#upload-category').value = selectedCategories.length === 1 && CUSTOM_CATEGORIES.includes(selectedCategories[0]) ? selectedCategories[0] : 'My sounds';
  selectAudioFiles(files); $('#upload-dialog').showModal();
}
function importProblem(message) {
  const active = document.querySelector('dialog[open]');
  const output = active?.querySelector('[role="status"]');
  if (output) output.textContent = message; else status(message);
}
async function routeImportFiles(files) {
  const active = document.querySelector('dialog[open]');
  if (!db) throw new Error('Local recording storage is unavailable. Reload with storage enabled before importing.');
  if (fileRouting || active?.dataset.busy || libraryBusy) throw new Error('An import or storage operation is in progress. Wait for it to finish.');
  if (active && !['upload-dialog', 'restore-dialog'].includes(active.id)) throw new Error('Close this dialog before importing files.');
  fileRouting = true;
  $('#import-submit').disabled = true;
  try {
    const input = await classifyFiles(files);
    if (input.kind === 'zip') {
      $('#upload-dialog').close(); openMixImport();
      const selection = new DataTransfer(); selection.items.add(input.file);
      $('#mix-zip').files = selection.files;
      await inspectMixFile(input.file);
    }
    else {
      pendingRestore = undefined; $('#restore-dialog').close();
      if ($('#upload-dialog').open) { selectAudioFiles(input.files); $('#import-status').textContent = ''; }
      else openAudioImport(input.files);
    }
  } finally { fileRouting = false; if (!$('#upload-dialog').dataset.busy) $('#import-submit').disabled = false; }
}
$('#add-sounds').onclick = () => openAudioImport();
$('#sound-files').onchange = () => {
  const files = Array.from($('#sound-files').files); selectAudioFiles([]);
  void routeImportFiles(files).catch(error => importProblem(error.message));
};
installFileDrop({ overlay: $('#file-drop-overlay'), onFiles: routeImportFiles, onProblem: importProblem });
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
  if (!db || $('#import-submit').disabled || fileRouting) return;
  const files = [...selectedAudioFiles];
  if (!files.length) { $('#import-status').textContent = 'Choose at least one audio file.'; return; }
  const category = CUSTOM_CATEGORIES.includes($('#upload-category').value) ? $('#upload-category').value : 'My sounds';
  for (const id of ['add-sounds', 'import-submit', 'sound-files', 'upload-category']) $(`#${id}`).disabled = true;
  $('#upload-dialog').dataset.busy = 'true';
  $('#import-submit').textContent = 'Adding…'; $('#import-status').textContent = 'Checking your recordings…';
  let imported = 0; const problems = [];
  // A separate decoder never connects imported audio to the speakers.
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  let decoder;
  try {
    decoder = new Context(); await decoder.suspend();
    for (const file of files) {
      try {
        if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('choose a file below 25 MB');
        if (await inspectDuration(file) > 120) throw new Error('choose a recording of two minutes or less');
        const data = await file.arrayBuffer();
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(byte => byte.toString(16).padStart(2, '0')).join('');
        if (catalog.some(sound => sound.hash === hash)) throw new Error('already in your library');
        if (catalog.filter(sound => sound.kind === 'custom').length >= 30) throw new Error('30 custom sounds are already stored');
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
    await decoder?.close().catch(() => {});
    delete $('#upload-dialog').dataset.busy;
    for (const id of ['add-sounds', 'import-submit', 'sound-files', 'upload-category']) $(`#${id}`).disabled = false;
    $('#import-submit').textContent = 'Add to library';
    mix = normalize(mix); renderSounds();
    if (imported) { showView('library'); $('#search').value = ''; setCategoryFilters([category]); }
    sync();
    const message = `${imported} recording${imported === 1 ? '' : 's'} added.${problems.length ? ` ${problems[0]}${problems.length > 1 ? ` (${problems.length - 1} other files could not be added.)` : ''}` : ' Tagged Uploaded and ready offline.'}`;
    $('#import-problems').replaceChildren(...problems.map(problem => { const item = document.createElement('li'); item.textContent = problem; return item; }));
    $('#import-problems').hidden = !problems.length;
    $('#import-status').textContent = message; status(message);
    if (imported && !problems.length) { $('#upload-dialog').close(); $('#upload-form').reset(); selectAudioFiles([]); }

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
