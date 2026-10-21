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
