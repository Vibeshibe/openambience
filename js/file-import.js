export async function classifyFiles(files) {
  if (!files.length) throw new Error('Drop audio files or one mix ZIP. Folders are not supported.');
  if (files.length > 30) throw new Error('Choose at most 30 audio files, or one mix ZIP.');
  const zips = [];
  for (const file of files) {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (/\.zip$/i.test(file.name) || /^(application\/(zip|x-zip-compressed))$/i.test(file.type)
      || (head[0] === 0x50 && head[1] === 0x4b && head[2] === 3 && head[3] === 4)) zips.push(file);
  }
  if (zips.length && files.length !== 1) throw new Error('Import one mix ZIP on its own, or a batch of audio files.');
  return zips.length ? { kind: 'zip', file: zips[0] } : { kind: 'audio', files };
}

export function installFileDrop({ target = document, overlay, onFiles, onProblem }) {
  let depth = 0;
  const hasFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files');
  const clear = () => { depth = 0; overlay.hidden = true; target.documentElement.classList.remove('file-drag'); };
  target.addEventListener('dragenter', event => {
    if (!hasFiles(event)) return;
    event.preventDefault(); depth++; overlay.hidden = false; target.documentElement.classList.add('file-drag');
  });
  target.addEventListener('dragover', event => { if (hasFiles(event)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } });
  target.addEventListener('dragleave', event => { if (hasFiles(event) && --depth <= 0) clear(); });
  target.addEventListener('drop', event => {
    if (!hasFiles(event)) return;
    event.preventDefault(); clear();
    const items = Array.from(event.dataTransfer.items || []);
    if (items.some(item => item.webkitGetAsEntry?.()?.isDirectory)) { onProblem('Drop files rather than folders.'); return; }
    // FileList is readable only during drop; copy it before awaiting anything.
    const files = Array.from(event.dataTransfer.files);
    void Promise.resolve().then(() => onFiles(files)).catch(error => onProblem(error.message));
  });
  target.defaultView?.addEventListener('blur', clear);
  target.addEventListener('dragend', clear);
}
