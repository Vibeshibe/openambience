"""Generate original waveform PNG icons using only the Python standard library."""
import struct
import zlib
from pathlib import Path


def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)


def icon(size):
    pixels = bytearray()
    for y in range(size):
        pixels.append(0)
        for x in range(size):
            px, py = (x + 0.5) * 192 / size, (y + 0.5) * 192 / size
            inside = False
            for center, start, end in [(48, 96, 104), (72, 68, 132), (96, 46, 146), (120, 68, 132), (144, 96, 104)]:
                closest = max(start, min(py, end))
                if (px - center) ** 2 + (py - closest) ** 2 <= 25:
                    inside = True
            pixels.extend((212, 230, 162) if inside else (20, 41, 36))
    header = struct.pack('!2I5B', size, size, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b'')


if __name__ == '__main__':
    directory = Path(__file__).resolve().parent.parent / 'icons'
    for size in (192, 512):
        (directory / f'icon-{size}.png').write_bytes(icon(size))
