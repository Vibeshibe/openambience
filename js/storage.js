// Audio stays on this device. Metadata and blobs commit in one transaction.
export function openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('openambience', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sounds', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
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
