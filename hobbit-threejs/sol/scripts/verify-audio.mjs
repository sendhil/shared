import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PASSAGE } from '../src/content/passage.ts';

const AUDIO_DIRECTORY = resolve('public/audio');
const METADATA_FILE = resolve(AUDIO_DIRECTORY, 'narration.json');
const BROWSER_FILES = [
  resolve(AUDIO_DIRECTORY, 'narration.m4a'),
  resolve(AUDIO_DIRECTORY, 'narration.mp3'),
];

function fail(message) {
  throw new Error(`Audio verification failed: ${message}`);
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    fail(`${command} exited with ${result.status}: ${result.stderr || result.stdout}`);
  }
  return `${result.stdout}\n${result.stderr}`;
}

function durationOf(file) {
  const value = Number(
    run('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', file,
    ]).trim(),
  );
  if (!Number.isFinite(value)) fail(`${file} has no finite duration`);
  return value;
}

function signalMetrics(file, duration) {
  const loudnessOutput = run('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file,
    '-af', 'loudnorm=I=-18:TP=-1.5:LRA=7:print_format=json',
    '-f', 'null', '-',
  ]);
  const loudnessBlocks = [...loudnessOutput.matchAll(/\{[\s\S]*?"input_i"[\s\S]*?\}/g)];
  const loudnessBlock = loudnessBlocks.at(-1)?.[0];
  if (!loudnessBlock) fail(`could not measure loudness for ${file}`);
  const loudness = JSON.parse(loudnessBlock);
  const integratedLufs = Number(loudness.input_i);
  const peakDbfs = Number(loudness.input_tp);
  if (!Number.isFinite(integratedLufs) || !Number.isFinite(peakDbfs)) {
    fail(`invalid loudness metrics for ${file}`);
  }

  const silenceOutput = run('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file,
    '-af', 'silencedetect=n=-50dB:d=0.1', '-f', 'null', '-',
  ]);
  const starts = [...silenceOutput.matchAll(/silence_start: ([\d.]+)/g)].map((match) => Number(match[1]));
  const ends = [...silenceOutput.matchAll(/silence_end: ([\d.]+)/g)].map((match) => Number(match[1]));
  const intervals = starts.map((start, index) => ({ start, end: ends[index] ?? duration }));
  const leadingSilence = intervals[0]?.start <= 0.05 ? intervals[0].end : 0;
  const last = intervals.at(-1);
  const trailingSilence = last && last.end >= duration - 0.1 ? duration - last.start : 0;

  return { integratedLufs, peakDbfs, intervals, leadingSilence, trailingSilence };
}

if (!existsSync(METADATA_FILE)) fail('narration.json is missing');
for (const file of BROWSER_FILES) {
  if (!existsSync(file) || statSync(file).size === 0) fail(`${file} is missing or empty`);
}

const metadata = JSON.parse(readFileSync(METADATA_FILE, 'utf8'));
const actualHash = createHash('sha256').update(PASSAGE, 'utf8').digest('hex');
if (metadata.textSha256 !== actualHash) fail('canonical passage SHA-256 does not match narration metadata');

for (const file of BROWSER_FILES) {
  const duration = durationOf(file);
  if (duration < 105 || duration > 180) {
    fail(`${file} duration ${duration.toFixed(3)}s is outside the 105–180s range`);
  }

  const metrics = signalMetrics(file, duration);
  if (metrics.peakDbfs >= -0.01) fail(`${file} decoded peak reaches 0 dBFS`);
  if (metrics.leadingSilence > 2) fail(`${file} has ${metrics.leadingSilence.toFixed(3)}s leading silence`);
  if (metrics.trailingSilence > 2) fail(`${file} has ${metrics.trailingSilence.toFixed(3)}s trailing silence`);

  const intervals = metrics.intervals.length
    ? metrics.intervals.map(({ start, end }) => `${start.toFixed(3)}–${end.toFixed(3)}s`).join(', ')
    : 'none';
  console.log(
    `${file.split('/').at(-1)}: duration=${duration.toFixed(3)}s, ` +
      `peak=${metrics.peakDbfs.toFixed(2)} dBFS, integrated=${metrics.integratedLufs.toFixed(2)} LUFS, ` +
      `silence=${intervals}`,
  );
}

console.log(`Audio verification PASS: canonical SHA-256 ${actualHash}`);
