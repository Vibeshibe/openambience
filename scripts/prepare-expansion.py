"""Prepare the 0.5 recording additions from verified creator-published previews.

Usage: python3 scripts/prepare-expansion.py SOURCE_DIRECTORY --ffmpeg /path/to/ffmpeg
Download each sourceDownloadUrl below into SOURCE_DIRECTORY as ID-source.mp3 first.
This updates audio/credits.json; then run node scripts/build-catalog.js.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
SOURCES = [
    dict(id='rain-tent', name='Rain on tent', category='Nature', icon='rain',
         creator='Breviceps', sourceTitle='Rain on tent',
         sourceUrl='https://freesound.org/people/Breviceps/sounds/484723/',
         sourceDownloadUrl='https://cdn.freesound.org/previews/484/484723_9159316-hq.mp3',
         sourceSha256='c9641fca328661bea9a424a14eddc590a0b66f64284cfe659b281a168d833be4',
         license='CC0-1.0', licenseUrl='http://creativecommons.org/publicdomain/zero/1.0/',
         excerptStartSeconds=35, durationSeconds=30),
    dict(id='birds-evening', name='Evening birds', category='Nature', icon='bird',
         creator='Benboncan', sourceTitle='Evening Birdsong.wav',
         sourceUrl='https://freesound.org/people/Benboncan/sounds/116667/',
         sourceDownloadUrl='https://cdn.freesound.org/previews/116/116667_634166-hq.mp3',
         sourceSha256='cb7fb89b02b125b804e9ebfe339700abfcd515f4ff00d74200413fa87e99ae0e',
         license='CC-BY-4.0', licenseUrl='https://creativecommons.org/licenses/by/4.0/',
         excerptStartSeconds=87, durationSeconds=60),
    dict(id='train-carriage', name='Train carriage', category='Indoors', icon='▤',
         creator='Vlatko Blažek', sourceTitle='Train interior ambiance',
         sourceUrl='https://freesound.org/people/VlatkoBlazek/sounds/322885/',
         sourceDownloadUrl='https://cdn.freesound.org/previews/322/322885_3452716-hq.mp3',
         sourceSha256='acdb8ea4cd05188cae8680578a79cbd1fe3ebbcff8fd5476e19f9335fdb775a0',
         license='CC-BY-4.0', licenseUrl='https://creativecommons.org/licenses/by/4.0/',
         attributionText='Vlatko Blažek · Varaždin, Croatia · e-mail: vlatkoblazek@gmail.com · http://www.freesound.org/people/VlatkoBlazek/',
         excerptStartSeconds=34, durationSeconds=60),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_directory', type=Path)
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    # Verify every input before replacing any packaged recording.
    for item in SOURCES:
        source = args.source_directory / (item['id'] + '-source.mp3')
        if hashlib.sha256(source.read_bytes()).hexdigest() != item['sourceSha256']:
            raise ValueError(f'Source checksum mismatch: {source}')
    register = ROOT / 'audio/credits.json'
    credits = json.loads(register.read_text())
    with tempfile.TemporaryDirectory(prefix='openambience-loops-') as work:
        for item in SOURCES:
            source = args.source_directory / (item['id'] + '-source.mp3')
            duration = item['durationSeconds']
            loop = Path(work) / (item['id'] + '.wav')
            # Join the final 1.5s to the first 1.5s, then append the middle.
            # The output's end and start meet at adjacent source samples.
            filters = (
                f'[0:a]aresample=44100,aformat=channel_layouts=stereo,atrim=duration={duration + 1.5},asetpts=PTS-STARTPTS,asplit=3[h][m][t];'
                '[h]atrim=end=1.5,asetpts=PTS-STARTPTS[head];'
                f'[m]atrim=start=1.5:end={duration},asetpts=PTS-STARTPTS[middle];'
                f'[t]atrim=start={duration},asetpts=PTS-STARTPTS[tail];'
                '[tail]afade=t=out:d=1.5[tailfade];[head]afade=t=in:d=1.5[headfade];'
                '[tailfade][headfade]amix=inputs=2:duration=longest:normalize=0[seam];'
                '[seam][middle]concat=n=2:v=0:a=1[out]'
            )
            subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-ss', str(item['excerptStartSeconds']),
                            '-i', str(source), '-filter_complex', filters, '-map', '[out]',
                            '-c:a', 'pcm_f32le', str(loop)], check=True)
            measured = subprocess.run([args.ffmpeg, '-hide_banner', '-i', str(loop), '-af',
                                       'loudnorm=I=-25:TP=-5:LRA=50:print_format=json', '-f', 'null', '-'],
                                      check=True, capture_output=True, text=True).stderr
            levels = json.JSONDecoder().raw_decode(measured[measured.rfind('{'):])[0]
            gain = min(-25 - float(levels['input_i']), -5 - float(levels['input_tp']))
            output = ROOT / 'audio' / (item['id'] + '.mp3')
            subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-i', str(loop), '-af', f'volume={gain}dB',
                            '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k', str(output)], check=True)
            data = output.read_bytes()
            entry = dict(item, kind='recording', mode='loop', url=f'./audio/{item["id"]}.mp3',
                         bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), retrievedOn='2026-10-05',
                         modifications=f'Excerpt starting at {item["excerptStartSeconds"]}s, stereo 44.1 kHz conversion, 1.5s wraparound crossfade, fixed gain {gain:+.2f} dB targeting -25 LUFS with a -5 dBTP cap, 128 kbit/s MP3 encoding.',
                         acquisition='Creator-published high-quality MP3 preview; not the lossless original.')
            credits['sounds'] = [sound for sound in credits['sounds'] if sound['id'] != item['id']]
            credits['sounds'].append(entry)
            print(f'{item["id"]}: {duration}s, {len(data)} bytes, gain {gain:+.2f}dB')
    for sound in credits['sounds']:
        if sound['id'] == 'birds':
            sound['name'] = 'Morning birds'
    register.write_text(json.dumps(credits, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
