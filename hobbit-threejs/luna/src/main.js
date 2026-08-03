import * as THREE from 'three';
import './styles.css';
import { STORY_DURATION, NARRATION_CUES } from './story.js';
import { createStoryClock } from './timeline.js';
import { createMaterials, createTerrain } from './scene/terrain.js';
import { createVillage } from './scene/architecture.js';
import { createCharacters } from './scene/characters.js';
import { createEffects } from './scene/effects.js';
import { createCinematicCamera } from './scene/camera.js';
import { createAudio } from './audio.js';
import { bindControls } from './controls.js';

function getUi(root = document) {
  const byId = (id) => root.getElementById(id);
  return {
    experience: byId('experience'),
    canvas: byId('world'),
    beginGate: byId('begin-gate'),
    beginButton: byId('begin-button'),
    gateStatus: byId('gate-status'),
    playButton: byId('play-button'),
    restartButton: byId('restart-button'),
    seekInput: byId('seek-input'),
    muteButton: byId('mute-button'),
    masterInput: byId('master-input'),
    narrationInput: byId('narration-input'),
    ambienceInput: byId('ambience-input'),
    captionsToggle: byId('captions-toggle'),
    orbitToggle: byId('orbit-toggle'),
    caption: byId('caption'),
    beatLabel: byId('beat-label'),
    timelineBeat: byId('timeline-beat'),
    timeReadout: byId('time-readout'),
    audioStatus: byId('audio-status'),
    fallbackPanel: byId('fallback-panel'),
    fallbackCopy: byId('fallback-copy'),
  };
}

function setFailure(ui, message) {
  ui.fallbackPanel.hidden = false;
  ui.fallbackCopy.textContent = message;
  ui.gateStatus.textContent = 'Captions and the original narration remain available.';
  ui.audioStatus.textContent = '3D view unavailable';
}

export function createExperience({ canvas, ui } = {}) {
  const resolvedUi = ui ?? getUi();
  const resolvedCanvas = canvas ?? resolvedUi.canvas;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: resolvedCanvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    setFailure(resolvedUi, 'This browser could not create a WebGL context. Try a current desktop browser with hardware acceleration enabled.');
    return { failed: true, error };
  }

  const scene = new THREE.Scene();
  const background = new THREE.Color(0x27453f);
  const dawnColor = new THREE.Color(0x476960);
  const duskColor = new THREE.Color(0x111c28);
  const fogDusk = new THREE.Color(0x0a1420);
  scene.background = background;
  scene.fog = new THREE.FogExp2(0x294b46, 0.018);

  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 150);
  camera.position.set(-31, 13, 25);
  camera.lookAt(0, 1.2, 1);
  const cameraRig = createCinematicCamera({ camera });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const hemisphere = new THREE.HemisphereLight(0xb8d5ca, 0x24312b, 1.55);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffd3a2, 3.7);
  sun.position.set(-24, 28, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 90;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x74a7a8, 0.6);
  fill.position.set(28, 12, -20);
  scene.add(fill);

  const materials = createMaterials(802);
  const terrain = createTerrain({ materials });
  const village = createVillage({ terrain, materials });
  const characters = createCharacters({ terrain, village });
  const effects = createEffects({ village, characters, materials });
  scene.add(terrain.group, village.group, characters.group, effects.group);

  let controls;
  const audio = createAudio({
    cues: NARRATION_CUES,
    onStatus: ({ mode, message }) => {
      resolvedUi.audioStatus.textContent = mode;
      resolvedUi.gateStatus.textContent = message;
    },
  });

  const updateMood = (state) => {
    const contrast = state.timeContrast ?? 0;
    background.lerpColors(dawnColor, duskColor, contrast);
    scene.fog.color.copy(background).lerp(fogDusk, contrast * 0.32);
    scene.fog.density = 0.014 + contrast * 0.012 + (state.rumorLevel ?? 0) * 0.002;
    sun.intensity = 3.7 - contrast * 2.2;
    sun.color.setHSL(0.09 + contrast * 0.52, 0.48, 0.74 - contrast * 0.18);
    hemisphere.intensity = 1.55 - contrast * 0.72;
    fill.intensity = 0.6 + contrast * 0.18;
    renderer.toneMappingExposure = 1.06 - contrast * 0.18;
  };

  const clock = createStoryClock({
    duration: STORY_DURATION,
    onState: (state) => {
      updateMood(state);
      audio.update(state);
      controls?.update(state);
    },
  });
  controls = bindControls({ clock, audio, camera: cameraRig, ui: resolvedUi });
  controls.update(clock.getState());

  let frameHandle = 0;
  let stopped = false;
  const render = (now) => {
    if (stopped) return;
    frameHandle = window.requestAnimationFrame(render);
    const state = clock.update(now / 1000);
    cameraRig.update(state);
    terrain.update(state);
    village.update(state);
    characters.update(state);
    effects.update(state);
    renderer.render(scene, camera);
  };

  const resize = () => {
    const width = resolvedUi.experience.clientWidth || window.innerWidth;
    const height = resolvedUi.experience.clientHeight || window.innerHeight;
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  window.addEventListener('resize', resize);
  resize();
  render(0);

  return {
    scene,
    camera,
    renderer,
    terrain,
    village,
    characters,
    effects,
    audio,
    clock,
    controls,
    destroy() {
      stopped = true;
      window.cancelAnimationFrame(frameHandle);
      window.removeEventListener('resize', resize);
      controls.destroy();
      audio.dispose();
      renderer.dispose();
    },
  };
}

export function start() {
  const ui = getUi();
  if (!ui.canvas || !ui.experience) return null;
  return createExperience({ canvas: ui.canvas, ui });
}

if (typeof document !== 'undefined') start();
