// Small ZIP implementation for portable mixes. Output uses STORE so a download
// can be restored without a compression API, including offline on older browsers.
export const ZIP_LIMITS = { files: 7, fileBytes: 25 * 1024 * 1024, totalBytes: 151 * 1024 * 1024, jsonBytes: 64 * 1024 };
export const COLLECTION_ZIP_LIMITS = { files: 31, fileBytes: ZIP_LIMITS.fileBytes, totalBytes: 754 * 1024 * 1024, jsonBytes: 4 * 1024 * 1024 };
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function safePath(path) {
  return typeof path === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path)
    && !path.split('/').some(part => !part || part === '.' || part === '..');
}
function header(size) {
  const bytes = new Uint8Array(size), view = new DataView(bytes.buffer);
  return { bytes, u16: (offset, value) => view.setUint16(offset, value, true), u32: (offset, value) => view.setUint32(offset, value, true) };
}
export async function createZip(entries, limits = ZIP_LIMITS) {
  if (!entries.length || entries.length > limits.files) throw new Error('Too many files in this mix archive.');
  const parts = [], directory = [], names = new Set();
  let offset = 0, expanded = 0;
  for (const { name, blob } of entries) {
    if (!safePath(name) || names.has(name)) throw new Error('Invalid or duplicate archive path.');
    names.add(name);
    if (!blob.size || blob.size > (['mix.json', 'mixes.json'].includes(name) ? limits.jsonBytes : limits.fileBytes)) throw new Error('A mix file exceeds the export size limit.');
    expanded += blob.size;
    if (expanded > limits.totalBytes) throw new Error('These mixes are too large to export.');
    const path = encoder.encode(name), checksum = crc32(new Uint8Array(await blob.arrayBuffer()));
    const local = header(30); local.u32(0, 0x04034b50); local.u16(4, 20); local.u16(6, 0x800);
    local.u16(12, 33); local.u32(14, checksum); local.u32(18, blob.size); local.u32(22, blob.size); local.u16(26, path.length);
    const central = header(46); central.u32(0, 0x02014b50); central.u16(4, 20); central.u16(6, 20); central.u16(8, 0x800);
    central.u16(14, 33); central.u32(16, checksum); central.u32(20, blob.size); central.u32(24, blob.size); central.u16(28, path.length); central.u32(42, offset);
    parts.push(local.bytes, path, blob); directory.push(central.bytes, path);
    offset += 30 + path.length + blob.size;
  }
  const centralSize = directory.reduce((size, bytes) => size + bytes.length, 0), end = header(22);
  end.u32(0, 0x06054b50); end.u16(8, entries.length); end.u16(10, entries.length); end.u32(12, centralSize); end.u32(16, offset);
  return new Blob([...parts, ...directory, end.bytes], { type: 'application/zip' });
}

async function inflate(bytes, expected) {
  let stream;
  try { stream = new DecompressionStream('deflate-raw'); }
  catch { throw new Error('This browser cannot open recompressed ZIPs. Use the original OpenAmbience download.'); }
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader(), chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > expected) { await reader.cancel(); throw new Error('Expanded ZIP data exceeds its declared size.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (size !== expected) throw new Error('Incomplete compressed ZIP data.');
  return new Uint8Array(await new Blob(chunks).arrayBuffer());
}

export async function readZip(file, limits = ZIP_LIMITS) {
  if (!file.size || file.size > limits.totalBytes + 65536) throw new Error(`Choose a mix ZIP of at most ${Math.floor(limits.totalBytes / 1024 / 1024)} MiB.`);
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer);
  const fail = () => { throw new Error('Invalid or incomplete mix ZIP.'); };
  const u16 = offset => offset + 2 <= bytes.length ? view.getUint16(offset, true) : fail();
  const u32 = offset => offset + 4 <= bytes.length ? view.getUint32(offset, true) : fail();
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--) if (u32(end) === 0x06054b50 && end + 22 + u16(end + 20) === bytes.length) break;
  if (end < 0 || u32(end) !== 0x06054b50) fail();
  const count = u16(end + 10), centralOffset = u32(end + 16), centralSize = u32(end + 12);
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== count || !count || count > limits.files || centralOffset + centralSize !== end) fail();
  const files = new Map(), ranges = [];
  let cursor = centralOffset, total = 0;
  // Validate the entire directory and all declared sizes before expanding files.
  const entries = [];
  for (let index = 0; index < count; index++) {
    if (u32(cursor) !== 0x02014b50 || cursor + 46 > end) fail();
    const flags = u16(cursor + 8), method = u16(cursor + 10), checksum = u32(cursor + 16);
    const packed = u32(cursor + 20), size = u32(cursor + 24), length = u16(cursor + 28), local = u32(cursor + 42);
    const next = cursor + 46 + length + u16(cursor + 30) + u16(cursor + 32);
    if (next > end || u16(cursor + 34) || (flags & ~0x808) || ![0, 8].includes(method)) throw new Error('Unsupported, encrypted, or invalid ZIP.');
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + length));
    if (!safePath(name) || files.has(name)) throw new Error('Unsafe or duplicate archive path.');
    files.set(name, null);
    if (!size || size > (['mix.json', 'mixes.json'].includes(name) ? limits.jsonBytes : limits.fileBytes) || (total += size) > limits.totalBytes) throw new Error('ZIP contents exceed the mix size limits.');
    if (local + 30 > centralOffset || u32(local) !== 0x04034b50 || u16(local + 6) !== flags || u16(local + 8) !== method) fail();
    const dataStart = local + 30 + u16(local + 26) + u16(local + 28), dataEnd = dataStart + packed;
    if (dataEnd > centralOffset || decoder.decode(bytes.subarray(local + 30, local + 30 + u16(local + 26))) !== name) fail();
    if (!(flags & 8) && (u32(local + 14) !== checksum || u32(local + 18) !== packed || u32(local + 22) !== size)) fail();
    if (method === 0 && packed !== size) fail();
    if (ranges.some(([start, stop]) => local < stop && dataEnd > start)) fail();
    ranges.push([local, dataEnd]); entries.push({ name, method, checksum, size, dataStart, dataEnd }); cursor = next;
  }
  if (cursor !== end) fail();
  for (const entry of entries) {
    const packed = bytes.subarray(entry.dataStart, entry.dataEnd);
    const data = entry.method === 0 ? packed : await inflate(packed, entry.size);
    if (crc32(data) !== entry.checksum) throw new Error(`Damaged file in ZIP: ${entry.name}.`);
    files.set(entry.name, new Blob([data]));
  }
  return files;
}
