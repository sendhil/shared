"""Generate local narration with Kokoro ONNX. No remote inference."""
import argparse
import json
import re
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

parser = argparse.ArgumentParser()
parser.add_argument('--models', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--samples', action='store_true')
parser.add_argument('--voice', default='bm_george')
parser.add_argument('--speed', type=float, default=0.91)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
project = Path(__file__).resolve().parents[1]
source = (project / 'public/audio/passage.txt').read_text().strip()
cuts = [
    'announced', 'magnificence,', 'Hobbiton.',
    'peculiar,', 'sixty years,', 'unexpected return.',
    'local legend,', 'old folk might say,', 'stuffed with treasure.',
    'enough for fame,', 'to marvel at.', 'Time wore on,',
    'on Mr. Baggins.', 'as at fifty.', 'well-preserved;',
    'nearer the mark.', 'a good thing;', 'perpetual youth',
    'inexhaustible wealth.', "paid for,'", 'they said.',
    "isn't natural,", "come of it!'",
]
phrases = []
rest = re.sub(r'\s+', ' ', source)
for cut in cuts:
    index = rest.index(cut) + len(cut)
    phrases.append(rest[:index].strip())
    rest = rest[index:].strip()
assert not rest
assert ' '.join(phrases) == re.sub(r'\s+', ' ', source)
kokoro = Kokoro(str(args.models / 'kokoro-v1.0.onnx'), str(args.models / 'voices-v1.0.bin'))
if args.samples:
    for voice in ['bm_george', 'bf_emma', 'bm_fable']:
        sample, rate = kokoro.create(' '.join(phrases[:3]), voice=voice, speed=args.speed, lang='en-gb')
        sf.write(str(args.output / (voice + '.wav')), sample, rate)
        print(voice, len(sample) / rate, flush=True)
    raise SystemExit()

rate = 24000
segments = [np.zeros(int(1.6 * rate), dtype=np.float32)]
cues = []
cursor = len(segments[0]) / rate
for index, phrase in enumerate(phrases):
    # "Mr." is expanded only for the speech engine; captions retain the original.
    spoken = phrase.replace('Mr.', 'Mister')
    samples, rate = kokoro.create(spoken, voice=args.voice, speed=args.speed, lang='en-gb')
    # Short ramps remove splices without clipping consonants.
    fade = min(120, len(samples) // 2)
    samples[:fade] *= np.linspace(0, 1, fade)
    samples[-fade:] *= np.linspace(1, 0, fade)
    duration = len(samples) / rate
    cues.append({'id': index, 'text': phrase, 'start': round(cursor, 5), 'end': round(cursor + duration, 5)})
    segments.append(samples)
    pause = 0.43 if re.search(r'[.!?][\x27]?$|;$', phrase) else 0.18
    if index in (2, 5, 8, 18): pause = 0.7
    silence = np.zeros(int(pause * rate), dtype=np.float32)
    segments.append(silence)
    cursor += duration + pause
    print(index, round(duration, 2), phrase, flush=True)
segments.append(np.zeros(int(4.0 * rate), dtype=np.float32))
audio = np.concatenate(segments)
audio *= 0.86 / max(np.max(np.abs(audio)), 0.001)
sf.write(str(args.output / 'narration.wav'), audio, rate, subtype='PCM_16')
manifest = {
    'title': 'The Unchanging Hill', 'voice': args.voice,
    'engine': 'Kokoro 82M / ONNX, generated locally',
    'speed': args.speed, 'sampleRate': rate,
    'duration': len(audio) / rate, 'source': source, 'cues': cues,
}
(args.output / 'cues.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print('Duration:', len(audio) / rate, flush=True)
