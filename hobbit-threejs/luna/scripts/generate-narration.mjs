import { existsSync, mkdirSync, mkdtempSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { NARRATION_CUES, NARRATION_SCRIPT, STORY_DURATION } from '../src/story.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const outputDir = resolve(root, 'public/audio');
const aiffPath = resolve(outputDir, 'narration.aiff');
const wavPath = resolve(outputDir, 'narration.wav');
mkdirSync(dirname(aiffPath), { recursive: true });

const probeDuration = (path) => {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return Number.parseFloat(probe.stdout ?? '');
};

const combined = spawnSync('say', ['-v', 'Samantha', '-o', aiffPath, NARRATION_SCRIPT], { stdio: 'ignore' });
if (combined.error || combined.status !== 0 || !existsSync(aiffPath) || !Number.isFinite(probeDuration(aiffPath)) || probeDuration(aiffPath) <= 0.1) {
  if (existsSync(aiffPath)) unlinkSync(aiffPath);
  console.log('Local macOS narration is unavailable; the browser voice fallback will be used.');
  process.exit(0);
}

const cueDir = mkdtempSync(resolve(root, 'work/narration-cues-'));
const cueFiles = [];
for (const cue of NARRATION_CUES) {
  const cuePath = join(cueDir, `${cue.id}.aiff`);
  const result = spawnSync('say', ['-v', 'Samantha', '-o', cuePath, cue.text], { stdio: 'ignore' });
  if (result.error || result.status !== 0 || !existsSync(cuePath) || !Number.isFinite(probeDuration(cuePath)) || probeDuration(cuePath) <= 0.1) {
    cueFiles.length = 0;
    break;
  }
  cueFiles.push(cuePath);
}

if (cueFiles.length !== NARRATION_CUES.length) {
  if (existsSync(aiffPath)) unlinkSync(aiffPath);
  if (existsSync(wavPath)) unlinkSync(wavPath);
  console.log('Local cue narration could not be rendered; the browser voice fallback will be used.');
  process.exit(0);
}

const inputs = cueFiles.flatMap((path) => ['-i', path]);
const delayed = NARRATION_CUES.map((cue, index) => {
  const delay = Math.round(cue.start * 1000);
  return `[${index}:a]adelay=delays=${delay}:all=1,apad=whole_dur=${STORY_DURATION}[cue${index}]`;
}).join(';');
const mixInputs = NARRATION_CUES.map((_, index) => `[cue${index}]`).join('');
const filter = `${delayed};${mixInputs}amix=inputs=${NARRATION_CUES.length}:duration=longest:normalize=0,atrim=duration=${STORY_DURATION},asetpts=N/SR/TB[out]`;
const ffmpeg = spawnSync('ffmpeg', ['-y', ...inputs, '-filter_complex', filter, '-map', '[out]', '-ar', '44100', '-ac', '1', wavPath], { stdio: 'ignore' });
const duration = probeDuration(wavPath);
if (ffmpeg.error || ffmpeg.status !== 0 || !existsSync(wavPath) || !Number.isFinite(duration) || duration < STORY_DURATION - 0.5) {
  if (existsSync(aiffPath)) unlinkSync(aiffPath);
  if (existsSync(wavPath)) unlinkSync(wavPath);
  console.log('Cue-aligned narration could not be rendered; the browser voice fallback will be used.');
  process.exit(0);
}

const alignedAiff = spawnSync('ffmpeg', ['-y', '-i', wavPath, '-ar', '44100', '-ac', '1', aiffPath], { stdio: 'ignore' });
if (alignedAiff.error || alignedAiff.status !== 0 || !existsSync(aiffPath) || !Number.isFinite(probeDuration(aiffPath)) || probeDuration(aiffPath) < STORY_DURATION - 0.5) {
  if (existsSync(aiffPath)) unlinkSync(aiffPath);
  if (existsSync(wavPath)) unlinkSync(wavPath);
  console.log('Cue-aligned narration conversion could not be validated; the browser voice fallback will be used.');
  process.exit(0);
}

console.log(`Local narration audio generated and aligned to ${STORY_DURATION} seconds.`);
