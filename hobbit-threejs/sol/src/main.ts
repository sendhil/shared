/// <reference types="vite/client" />

import {
  Color,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { projectAudioSnapshot } from './app/AudioProjection';
import {
  LanternHillApp,
  type SoundscapePort,
  type TimelinePort,
} from './app/LanternHillApp';
import { AudioBus } from './audio/AudioBus';
import { NarrationPlayer } from './audio/NarrationPlayer';
import { ProceduralSoundscape } from './audio/ProceduralSoundscape';
import { SoundEventSchedule } from './audio/SoundEventSchedule';
import { CinematicCamera } from './camera/CinematicCamera';
import { buildShotPlan } from './camera/shotPlan';
import {
  castSemanticProgress,
  createCast,
  type CastHandle,
} from './cast/Cast';
import { createAtmosphere, type Atmosphere } from './effects/Atmosphere';
import {
  createRenderer,
  type ReadyRenderer,
} from './render/Renderer';
import { MasterTimeline } from './timeline/MasterTimeline';
import {
  evaluateNarrative,
  type NarrativeDirectorState,
} from './timeline/NarrativeDirector';
import { deriveCues } from './timeline/deriveCues';
import type { NarrativeCue } from './timeline/types';
import { BeginOverlay } from './ui/BeginOverlay';
import { CaptionView } from './ui/Captions';
import {
  Controls,
  dispatchKeyboardShortcut,
  type ControlActions,
} from './ui/Controls';
import {
  Fallback,
  SpeechFallback,
  SpeechMediaClock,
} from './ui/Fallback';
import { createWorld, type WorldHandle } from './world/World';
import './styles.css';

const WORLD_SEED = 111;
const MEASURED_NARRATION_DURATION = 110.8;

class WebGLSetupError extends Error {
  override readonly name = 'WebGLSetupError';
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`${name} is not ready`);
  return value;
}

function makeLayer(className: string): HTMLDivElement {
  const layer = document.createElement('div');
  layer.className = className;
  return layer;
}

async function mountLanternHill(): Promise<void> {
  const mount = document.querySelector<HTMLElement>('#app');
  if (!mount) throw new Error('Lantern Hill requires an #app mount point');
  const verification = import.meta.env.DEV
    ? await import('./verification/debugProbe')
    : undefined;
  const verificationQuery = verification?.parseVerificationQuery(
    window.location.search,
  );
  const debugErrors = verification ? new verification.DebugErrorLog() : undefined;

  const shell = document.createElement('main');
  shell.className = 'experience-shell';
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('aria-label', 'The cinematic world of Lantern Hill');
  const captionHost = makeLayer('caption-stage');
  const controlsHost = makeLayer('playback-rail-wrap');
  const beginHost = makeLayer('begin-layer');
  const fallbackHost = makeLayer('fallback-layer');
  const status = document.createElement('p');
  status.className = 'screen-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  shell.append(canvas, captionHost, controlsHost, beginHost, fallbackHost, status);
  mount.replaceChildren(shell);

  const scene = new Scene();
  scene.background = new Color('#6E86A6');
  const camera = new PerspectiveCamera(50, 1, 0.12, 180);
  const audioBus = new AudioBus();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer: ReadyRenderer | undefined;
  let world: WorldHandle | undefined;
  let cast: CastHandle | undefined;
  let atmosphere: Atmosphere | undefined;
  let orbitControls: OrbitControls | undefined;
  let cinematicCamera: CinematicCamera | undefined;
  let audioContext: AudioContext | undefined;
  let masterGain: GainNode | undefined;
  let narrationGain: GainNode | undefined;
  let ambienceGain: GainNode | undefined;
  let narration: NarrationPlayer | undefined;
  let soundscape: ProceduralSoundscape | undefined;
  let activeTimeline: MasterTimeline | undefined;
  let cues: readonly NarrativeCue[] = deriveCues(MEASURED_NARRATION_DURATION);
  let directorState: NarrativeDirectorState | undefined;
  let usingSpeech = false;
  let speechFallback: SpeechFallback<SpeechSynthesisUtterance> | undefined;
  let application: LanternHillApp;
  let orbitMode = false;

  let captionView = new CaptionView(captionHost, cues);
  captionView.setVisible(true);
  let captionsVisible = true;

  const timelinePort: TimelinePort = {
    snapshot: () => activeTimeline?.snapshot() ?? {
      time: 0,
      duration: MEASURED_NARRATION_DURATION,
      progress: 0,
      state: 'ready',
    },
    play: async () => { await required(activeTimeline, 'timeline').play(); },
    pause: () => { activeTimeline?.pause(); },
    seek: (time) => { required(activeTimeline, 'timeline').seek(time); },
    restart: () => { required(activeTimeline, 'timeline').restart(); },
  };

  const soundscapePort: SoundscapePort = {
    startAt: (time) => { soundscape?.startAt(time); },
    update: (time) => { soundscape?.update(time); },
    pause: () => { soundscape?.pause(); },
    seek: (time) => { soundscape?.seek(time); },
    dispose: () => {
      soundscape?.dispose();
      soundscape = undefined;
    },
  };

  const audioContextConstructor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  const applyAudioLevels = (): void => {
    if (!audioContext || !masterGain || !narrationGain || !ambienceGain) return;
    projectAudioSnapshot(
      audioBus.snapshot(),
      {
        master: masterGain.gain,
        narration: narrationGain.gain,
        ambience: ambienceGain.gain,
      },
      audioContext.currentTime,
    );
  };

  const ensureAudioGraph = (): AudioContext => {
    if (audioContext) return audioContext;
    if (!audioContextConstructor) throw new Error('Web Audio is unavailable in this browser.');
    audioContext = new audioContextConstructor();
    masterGain = audioContext.createGain();
    narrationGain = audioContext.createGain();
    ambienceGain = audioContext.createGain();
    narrationGain.connect(masterGain);
    ambienceGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
    narration = new NarrationPlayer(audioContext, narrationGain);
    applyAudioLevels();
    return audioContext;
  };

  const createSpeechFallback = (): SpeechFallback<SpeechSynthesisUtterance> | undefined => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return undefined;
    return new SpeechFallback(
      cues,
      {
        cancel: () => window.speechSynthesis.cancel(),
        speak: (utterance) => window.speechSynthesis.speak(utterance),
      },
      (text) => new SpeechSynthesisUtterance(text),
    );
  };

  const ensureCinematicCamera = (duration: number): void => {
    if (!world) return;
    cinematicCamera = new CinematicCamera(
      camera,
      buildShotPlan(duration, world.anchors, WORLD_SEED, cues),
    );
    cinematicCamera.evaluate(timelinePort.snapshot().time);
    if (orbitControls) orbitControls.target.copy(cinematicCamera.target);
  };

  const ensureNarration = async (): Promise<number> => {
    if (verificationQuery?.failAudio) {
      throw new Error('Narration failure forced by the verification query.');
    }
    ensureAudioGraph();
    const duration = await required(narration, 'narration').load();
    cues = deriveCues(duration);
    activeTimeline = new MasterTimeline(required(narration, 'narration'));
    captionView = new CaptionView(captionHost, cues);
    captionView.setVisible(captionsVisible);
    speechFallback = createSpeechFallback();
    ensureCinematicCamera(duration);
    directorState = evaluateNarrative(activeTimeline.snapshot(), cues);
    return duration;
  };

  const resize = (): void => {
    const width = Math.max(1, shell.clientWidth || window.innerWidth);
    const height = Math.max(1, shell.clientHeight || window.innerHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer?.resize(width, height, window.devicePixelRatio);
  };

  type CameraRecord = Readonly<{
    position: Vector3;
    quaternion: Quaternion;
    target: Vector3;
    fov: number;
  }>;

  const exploration = {
    setOrbit: (enabled: boolean) => {
      orbitMode = enabled;
      const controls = orbitControls;
      if (!controls) return;
      if (enabled && cinematicCamera) controls.target.copy(cinematicCamera.target);
      const spectator = application?.state === 'spectator';
      controls.enabled = enabled || spectator;
      controls.enablePan = spectator;
      controls.update();
    },
    capture: (): CameraRecord => ({
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      target: orbitControls?.target.clone() ?? new Vector3(),
      fov: camera.fov,
    }),
    enterSpectator: (value: unknown) => {
      const record = value as CameraRecord;
      const controls = required(orbitControls, 'orbit controls');
      controls.target.copy(record.target);
      controls.enabled = true;
      controls.enablePan = true;
      controls.update();
    },
    exitSpectator: (value: unknown) => {
      const record = value as CameraRecord;
      camera.position.copy(record.position);
      camera.quaternion.copy(record.quaternion);
      camera.fov = record.fov;
      camera.updateProjectionMatrix();
      const controls = required(orbitControls, 'orbit controls');
      controls.target.copy(record.target);
      controls.enablePan = false;
      controls.enabled = orbitMode;
      controls.update();
    },
  };

  const speechSeek = (time: number): void => {
    const cue = speechFallback?.startAt(time);
    application.seekTo(cue?.start ?? time);
  };

  const controlActions: ControlActions = {
    togglePlayback: async () => {
      if (usingSpeech) {
        if (application.state === 'playing') window.speechSynthesis.pause();
        else if (application.state === 'paused') window.speechSynthesis.resume();
        else speechFallback?.startAt(0);
      }
      await application.togglePlayback();
    },
    restart: () => {
      if (usingSpeech) speechFallback?.startAt(0);
      application.restart();
    },
    seekTo: (time) => {
      if (usingSpeech) speechSeek(time);
      else application.seekTo(time);
    },
    seekBy: (delta) => {
      const target = timelinePort.snapshot().time + delta;
      if (usingSpeech) speechSeek(target);
      else application.seekTo(target);
    },
    toggleMute: () => {
      const snapshot = audioBus.snapshot();
      audioBus.setMuted(!snapshot.muted);
      applyAudioLevels();
    },
    setMasterVolume: (value) => { audioBus.setMaster(value); applyAudioLevels(); },
    setNarrationVolume: (value) => { audioBus.setNarration(value); applyAudioLevels(); },
    setAmbienceVolume: (value) => { audioBus.setAmbience(value); applyAudioLevels(); },
    toggleCaptions: () => {
      captionsVisible = !captionsVisible;
      captionView.setVisible(captionsVisible);
    },
    toggleOrbit: () => { application.toggleOrbit(); },
    toggleSpectator: () => { application.toggleSpectator(); },
    exitSpectator: () => { application.exitSpectator(); },
  };

  const controlsView = new Controls(controlsHost, controlActions);
  controlsView.update({
    state: 'loading',
    time: 0,
    duration: MEASURED_NARRATION_DURATION,
    ...audioBus.snapshot(),
    captionsVisible,
    orbitActive: false,
    spectatorActive: false,
  });

  const fallback = new Fallback(fallbackHost, {
    playNarration: async () => {
      await ensureNarration();
      const context = ensureAudioGraph();
      if (context.state !== 'running') await context.resume();
      await required(activeTimeline, 'timeline').play();
    },
    pauseNarration: () => { activeTimeline?.pause(); },
    retry: async () => {
      try {
        await application.retry();
        fallback.hide();
        status.textContent = '';
        application.start();
      } catch {
        // onError has already refreshed the recovery view.
      }
    },
    useSpeech: () => {
      const fallbackSpeech = createSpeechFallback();
      if (!fallbackSpeech) {
        status.textContent = 'Browser speech is unavailable here. Retry the local narration instead.';
        return;
      }
      usingSpeech = true;
      speechFallback = fallbackSpeech;
      const speechClock = new SpeechMediaClock(MEASURED_NARRATION_DURATION);
      activeTimeline = new MasterTimeline(speechClock);
      ensureCinematicCamera(MEASURED_NARRATION_DURATION);
      const cue = speechFallback.startAt(timelinePort.snapshot().time);
      if (cue) speechClock.currentTime = cue.start;
      directorState = evaluateNarrative(activeTimeline.snapshot(), cues);
      fallback.hide();
      beginOverlay.hide();
      void application.activateFallback().then(() => application.start()).catch((error: unknown) => {
        status.textContent = error instanceof Error ? error.message : 'Browser speech could not start.';
      });
    },
  });

  const beginOverlay = new BeginOverlay(beginHost, async () => {
    try {
      await application.begin();
      beginOverlay.hide();
    } catch {
      // The lifecycle error callback displays the narration recovery route.
    }
  });

  application = new LanternHillApp({
    timeline: timelinePort,
    soundscape: soundscapePort,
    audio: {
      resume: async () => {
        if (usingSpeech) return;
        const context = ensureAudioGraph();
        if (context.state !== 'running') await context.resume();
      },
    },
    exploration,
    loadStage: async (stage) => {
      if (stage === 'renderer') {
        const handle = createRenderer(canvas, {
          preference: verificationQuery?.quality,
        });
        if (!handle.supported) throw new WebGLSetupError(handle.reason);
        renderer = handle;
        orbitControls = new OrbitControls(camera, canvas);
        orbitControls.enabled = false;
        orbitControls.enableDamping = !reducedMotion;
        orbitControls.dampingFactor = 0.055;
        orbitControls.minDistance = 3;
        orbitControls.maxDistance = 46;
        orbitControls.maxPolarAngle = Math.PI * 0.49;
        resize();
        return;
      }
      if (stage === 'world') {
        world = createWorld(scene, WORLD_SEED);
        atmosphere = createAtmosphere({
          quality: required(renderer, 'renderer').quality,
          particleSeed: WORLD_SEED,
          anchors: world.anchors,
        });
        scene.add(atmosphere.group);
        scene.fog = atmosphere.fog;
        return;
      }
      if (stage === 'cast') {
        cast = createCast(required(world, 'world'), WORLD_SEED);
        return;
      }
      if (stage === 'narration') {
        await ensureNarration();
        return;
      }
      const context = ensureAudioGraph();
      const duration = required(activeTimeline, 'timeline').snapshot().duration;
      soundscape = new ProceduralSoundscape(
        context,
        required(ambienceGain, 'ambience gain'),
        new SoundEventSchedule(WORLD_SEED, duration),
      );
    },
    evaluators: {
      director: (snapshot) => {
        directorState = evaluateNarrative(snapshot, cues);
      },
      world: (snapshot) => {
        const direction = required(directorState, 'narrative direction');
        required(world, 'world').updateWorld(snapshot.time, {
          progress: direction.progress,
          season: direction.seasonBlend,
        });
      },
      cast: (snapshot) => {
        const direction = required(directorState, 'narrative direction');
        required(cast, 'cast').evaluateCast(
          snapshot.time,
          castSemanticProgress(direction),
        );
      },
      camera: (snapshot) => {
        const controls = required(orbitControls, 'orbit controls');
        if (application.state === 'spectator' || application.orbitActive) {
          controls.update();
          return;
        }
        const cinematic = required(cinematicCamera, 'cinematic camera');
        cinematic.evaluate(snapshot.time);
        controls.target.copy(cinematic.target);
      },
      effects: (snapshot) => {
        const direction = required(directorState, 'narrative direction');
        required(atmosphere, 'atmosphere').evaluate(snapshot, {
          fogDensity: direction.fogDensity,
          doorwayLight: direction.doorwayLight,
          cutawayOpacity: direction.cutawayOpacity,
          constellationIntensity: direction.constellationIntensity,
          shadowLength: direction.shadowLength,
        });
      },
      captions: (snapshot) => { captionView.update(snapshot.time); },
      controls: (snapshot) => {
        const levels = audioBus.snapshot();
        controlsView.update({
          state: application.state,
          time: snapshot.time,
          duration: snapshot.duration,
          ...levels,
          captionsVisible,
          orbitActive: application.orbitActive,
          spectatorActive: application.state === 'spectator',
        });
      },
    },
    present: () => {
      required(renderer, 'renderer').renderer.render(scene, camera);
    },
    restoreContext: async () => {
      resize();
    },
    onLoadingStage: (stage) => { beginOverlay.setStage(stage); },
    onStateChange: (state) => { shell.dataset.state = state; },
    onError: ({ phase, error }) => {
      debugErrors?.record(phase, error, timelinePort.snapshot().time);
      const detail = error instanceof Error ? error.message : 'An unknown error occurred.';
      status.textContent = `${phase}: ${detail}`;
      if (phase === 'renderer') fallback.show('webgl', detail);
      else if (phase === 'narration' || phase === 'audio' || phase === 'playback') {
        fallback.show('narration', detail);
      } else fallback.show('runtime', detail);
    },
  });

  if (verification) {
    verification.installDebugProbe(window, {
      state: () => application.state,
      timeline: () => timelinePort.snapshot(),
      director: () => directorState,
      camera: () => ({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: orbitControls
          ? [orbitControls.target.x, orbitControls.target.y, orbitControls.target.z]
          : [0, 0, 0],
        fov: camera.fov,
      }),
      residentCount: () => cast?.residents.length ?? 0,
      renderer: () => {
        const render = (renderer?.renderer as unknown as {
          info?: { render?: { calls?: number; triangles?: number } };
        } | undefined)?.info?.render;
        return {
          drawCalls: render?.calls ?? 0,
          triangles: render?.triangles ?? 0,
        };
      },
      audio: () => audioBus.snapshot(),
      quality: () => renderer?.quality.name,
      recentErrors: () => debugErrors?.snapshot() ?? [],
    });
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    dispatchKeyboardShortcut({
      key: event.key,
      target: event.target as HTMLElement | null,
      preventDefault: () => event.preventDefault(),
    }, controlActions);
  };
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) soundscapePort.pause();
    else if (application.state === 'playing') soundscapePort.startAt(timelinePort.snapshot().time);
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    canvas.dataset.contextLost = 'true';
    status.textContent = 'The graphics context was interrupted. Playback is paused.';
    application.handleContextLost();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    void application.handleContextRestored().then(() => {
      delete canvas.dataset.contextLost;
      status.textContent = 'The view was restored. Resume when ready.';
    });
  });

  window.addEventListener('beforeunload', () => {
    document.removeEventListener('keydown', onKeyDown);
    application.dispose();
    orbitControls?.dispose();
    cast?.dispose();
    atmosphere?.dispose();
    world?.dispose();
    renderer?.dispose();
    window.speechSynthesis?.cancel();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  }, { once: true });

  try {
    await application.load();
    if (verification && verificationQuery) {
      verification.applyVerificationQuery(verificationQuery, {
        seek: (time) => { application.seekTo(time); },
        setCaptions: (visible) => {
          captionsVisible = visible;
          captionView.setVisible(visible);
        },
        setMuted: (muted) => {
          audioBus.setMuted(muted);
          applyAudioLevels();
        },
      });
    }
    application.start();
  } catch {
    // The precise subsystem failure is already exposed by onError.
  }
}

void mountLanternHill();
