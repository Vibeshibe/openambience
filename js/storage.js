import { usageSignature, withoutSound } from './library-management.js';
// Audio stays on this device. Metadata and blobs commit in one transaction.
export function openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('openambience', 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('sounds')) request.result.createObjectStore('sounds', { keyPath: 'id' });
      request.result.createObjectStore('state');
    };
    request.onblocked = () => { blocked = true; reject(new Error('Close other OpenAmbience tabs and reload to update local storage.')); };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}
export function libraryAction(db, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sounds', mode);
    const request = action(tx.objectStore('sounds'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted.'));
  });
}
export const listSounds = db => libraryAction(db, 'readonly', store => store.getAll());
export const putSound = (db, sound) => libraryAction(db, 'readwrite', store => store.put(sound));
export const deleteSound = (db, id) => libraryAction(db, 'readwrite', store => store.delete(id));

export function readLibraryState(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('state').objectStore('state').get('current');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// The recipe and every new recording either commit together or all roll back.
// add() deliberately refuses to overwrite an existing library ID.
export function commitLibraryState(db, state, sounds = []) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sounds', 'state'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not save the mix.'));
    tx.onabort = () => reject(tx.error || new Error('Could not save the mix.'));
    try {
      for (const sound of sounds) tx.objectStore('sounds').add(sound);
      tx.objectStore('state').put(state, 'current');
    } catch (error) {
      // Synchronous clone/quota failures do not automatically abort a transaction.
      // Discard earlier add requests as well as the failed settings write.
      try { tx.abort(); } catch {}
      reject(error);
    }
  });
}

// Recheck references inside the deleting transaction so another tab cannot add
// an affected mix between the impact preview and the actual removal.
export function removeSoundAndReferences(db, id, expected) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sounds', 'state'], 'readwrite');
    let next, failure;
    tx.oncomplete = () => resolve(next);
    tx.onerror = () => reject(failure || tx.error);
    tx.onabort = () => reject(failure || tx.error || new Error('Removal canceled.'));
    const request = tx.objectStore('state').get('current');
    request.onsuccess = () => {
      try {
        const state = request.result;
        if (!state || usageSignature(state, id) !== expected.usage || JSON.stringify(state) !== expected.state) throw new Error('Mix references changed or another tab updated your settings. Reload and review the recording again before removing it.');
        const soundRequest = tx.objectStore('sounds').get(id);
        soundRequest.onsuccess = () => {
          try {
            const sound = soundRequest.result;
            if (!sound || (sound.hash || sound.url) !== expected.identity) throw new Error('This sound changed in another tab. Reload before removing it.');
            next = withoutSound(state, id);
            tx.objectStore('sounds').delete(id);
            tx.objectStore('state').put(next, 'current');
          } catch (error) { failure = error; tx.abort(); }
        };
      } catch (error) { failure = error; tx.abort(); }
    };
  });
}
