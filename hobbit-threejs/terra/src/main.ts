import * as THREE from 'three';
import { AmbienceDirector } from './audio/AmbienceDirector';
import { MediaNarrator } from './audio/MediaNarrator';
import { estimateNarrationDuration, SpeechNarrator } from './audio/SpeechNarrator';
import { CameraDirector } from './cinema/CameraDirector';
import { PHRASES } from './content/passage';
import { storyAt } from './narrative/NarrativeDirector';
import { activeCueAt, buildCues, clamp } from './timeline/cues';
import { PlaybackUI } from './ui/PlaybackUI';
import { updateVillager } from './characters/CharacterRig';
import { EnvironmentEffects } from './world/EnvironmentEffects';
import { buildWorld } from './world/buildWorld';
import './styles.css';

declare global {
  interface Window {
    __appReady?: boolean;
    __hillsideDebug?: {
      snapshot: () => ReturnType<SpeechNarrator['snapshot']>;
      seek: (ratio: number) => void;
      setSpectator: (enabled: boolean) => void;
    };
  }
}

const root = document.querySelector<HTMLElement>('#app');

const showFatal = (title: string, detail: string): void => {
  if (!root) return;
  root.innerHTML = '';
  const card = document.createElement('article');
  card.className = 'error-card';
  const heading = document.createElement('h1');
  heading.textContent = title;
  const paragraph = document.createElement('p');
  paragraph.textContent = detail;
  card.append(heading, paragraph);
  root.append(card);
};

if (!root) {
  throw new Error('The application root is missing.');
}

try {
  const canvas = document.createElement('canvas');
  canvas.className = 'experience-canvas';
  canvas.setAttribute('aria-label', 'A cinematic storybook hillside');
  root.append(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 160);
  const world = buildWorld(scene);
  const effects = new EnvironmentEffects(scene, world);
  const director = new CameraDirector(camera, canvas, world);
  const cues = buildCues(estimateNarrationDuration(PHRASES.map((phrase) => phrase.text)), PHRASES);
  let narrator: MediaNarrator | SpeechNarrator = new MediaNarrator(
    new Audio(`${import.meta.env.BASE_URL}audio/narration.m4a`),
    cues,
    PHRASES,
    'Samantha · local narration file',
  );
  const ambience = new AmbienceDirector();
  let masterLevel = 0.86;
  let muted = false;
  let pausedForVisibility = false;
  let ui: PlaybackUI;

  const setMaster = (value: number): void => {
    masterLevel = clamp(value, 0, 1);
    const applied = muted ? 0 : masterLevel;
    narrator.setMasterGain(applied);
    ambience.setMasterGain(applied);
  };

  const seekToRatio = (ratio: number): void => {
    const snapshot = narrator.snapshot();
    const target = snapshot.duration * clamp(ratio, 0, 1);
    narrator.seek(target, snapshot.state === 'playing');
  };

  ui = new PlaybackUI(root, {
    begin: async () => {
      await ambience.begin();
      await narrator.start(0);
    },
    toggle: async () => {
      const snapshot = narrator.snapshot();
      if (snapshot.state === 'playing') narrator.pause();
      else await narrator.start(snapshot.time);
    },
    restart: async () => {
      await ambience.begin();
      narrator.restart();
    },
    seek: seekToRatio,
    mute: () => {
      muted = !muted;
      setMaster(masterLevel);
    },
    master: setMaster,
    narration: (value) => narrator.setNarrationGain(value),
    ambience: (value) => ambience.setAmbienceGain(value),
    captions: () => undefined,
    spectator: (enabled) => director.setSpectator(enabled),
  });

  void narrator.prepare().then(() => {
    if (narrator.snapshot().state === 'error') ui.setError(narrator.snapshot().error ?? 'The local narration file could not be prepared.');
  }).catch(async () => {
    const fallback = new SpeechNarrator(cues);
    await fallback.prepare();
    narrator = fallback;
    narrator.setMasterGain(muted ? 0 : masterLevel);
    if (narrator.snapshot().state === 'error') ui.setError(narrator.snapshot().error ?? 'The browser voice could not be prepared.');
  });

  const resize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener('resize', resize);

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const snapshot = narrator.snapshot();
    if (snapshot.state === 'playing') narrator.pause();
    else void narrator.start(snapshot.time);
  });

  document.addEventListener('visibilitychange', () => {
    const snapshot = narrator.snapshot();
    if (document.hidden && snapshot.state === 'playing') {
      pausedForVisibility = true;
      narrator.pause();
    } else if (!document.hidden && pausedForVisibility) {
      pausedForVisibility = false;
      void narrator.start(narrator.snapshot().time);
    }
  });

  const render = (): void => {
    const snapshot = narrator.snapshot();
    const cue = snapshot.cue ?? activeCueAt(cues, snapshot.time);
    const cueDuration = cue ? Math.max(0.01, cue.end - cue.start) : 1;
    const localProgress = cue ? clamp((snapshot.time - cue.start) / cueDuration, 0, 1) : 0;
    const state = storyAt(cue, localProgress);
    updateVillager(world.hero, snapshot.time, state);
    world.villagers.forEach((villager) => updateVillager(villager, snapshot.time, state));
    effects.update(state, snapshot.time);
    ambience.update(state, snapshot.time);
    director.update(state, snapshot.time);
    renderer.render(scene, camera);
    ui.render(snapshot);
    requestAnimationFrame(render);
  };
  render();

  window.__hillsideDebug = {
    snapshot: () => narrator.snapshot(),
    seek: seekToRatio,
    setSpectator: (enabled) => director.setSpectator(enabled),
  };
  window.__appReady = true;
} catch (error) {
  showFatal('The hillside could not open', error instanceof Error ? error.message : 'WebGL is unavailable in this browser.');
}
