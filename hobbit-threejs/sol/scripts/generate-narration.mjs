import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PASSAGE } from '../src/content/passage.ts';

const AUDIO_DIRECTORY = resolve('public/audio');
const VOICE = 'Daniel';
const VOICE_RATE = 40;
const SENTENCE_PAUSE_MILLISECONDS = 950;
const PARAGRAPH_PAUSE_MILLISECONDS = 1300;
const FORMATS = {
  aiff: join(AUDIO_DIRECTORY, 'narration.aiff'),
  m4a: join(AUDIO_DIRECTORY, 'narration.m4a'),
  mp3: join(AUDIO_DIRECTORY, 'narration.mp3'),
};

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with status ${result.status}\n${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

function probe(file) {
  const output = run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'format=duration:stream=codec_name,sample_rate,channels,duration',
    '-of', 'json',
    file,
  ]);
  const parsed = JSON.parse(output);
  const stream = parsed.streams?.[0];
  const duration = Number(parsed.format?.duration ?? stream?.duration);
  if (!stream || !Number.isFinite(duration)) {
    throw new Error(`ffprobe did not return valid audio metadata for ${file}`);
  }
  return {
    duration,
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: Number(stream.channels),
  };
}

function speechText(passage) {
  const paragraphs = passage.split('\n\n');
  return paragraphs
    .map((paragraph, paragraphIndex) =>
      paragraph.replace(/[.!?](?:['"])?(?=\s|$)/g, (punctuation, offset) => {
        const isFinal = paragraphIndex === paragraphs.length - 1 &&
          offset + punctuation.length === paragraph.length;
        return isFinal ? punctuation : `${punctuation} [[slnc ${SENTENCE_PAUSE_MILLISECONDS}]]`;
      }),
    )
    .join(` [[slnc ${PARAGRAPH_PAUSE_MILLISECONDS}]] `);
}

mkdirSync(AUDIO_DIRECTORY, { recursive: true });
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'lantern-hill-narration-'));
const passageFile = join(temporaryDirectory, 'passage.txt');

try {
  writeFileSync(passageFile, speechText(PASSAGE), 'utf8');
  run('/usr/bin/say', ['-v', VOICE, '-r', String(VOICE_RATE), '-f', passageFile, '-o', FORMATS.aiff]);

  const normalize = 'loudnorm=I=-18:TP=-1.5:LRA=7';
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', FORMATS.aiff,
    '-af', normalize, '-ar', '44100', '-ac', '1', '-c:a', 'aac', '-b:a', '192k', FORMATS.m4a,
  ]);
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', FORMATS.aiff,
    '-af', normalize, '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '192k', FORMATS.mp3,
  ]);

  const metadata = {
    voice: VOICE,
    wordsPerMinute: VOICE_RATE,
    sentencePauseMilliseconds: SENTENCE_PAUSE_MILLISECONDS,
    paragraphPauseMilliseconds: PARAGRAPH_PAUSE_MILLISECONDS,
    textSha256: createHash('sha256').update(PASSAGE, 'utf8').digest('hex'),
    sourceBytes: readFileSync(FORMATS.aiff).byteLength,
    formats: Object.fromEntries(
      Object.entries(FORMATS).map(([format, file]) => [format, probe(file)]),
    ),
  };
  writeFileSync(
    join(AUDIO_DIRECTORY, 'narration.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `Generated Daniel narration: ${metadata.formats.m4a.duration.toFixed(3)} seconds, ` +
      `${metadata.formats.m4a.sampleRate} Hz, ${metadata.formats.m4a.channels} channel(s)`,
  );
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
