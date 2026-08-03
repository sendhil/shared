export type ControlActions = Readonly<{
  togglePlayback(): void | Promise<void>;
  restart(): void | Promise<void>;
  seekTo(time: number): void;
  seekBy(delta: number): void;
  toggleMute(): void;
  setMasterVolume(value: number): void;
  setNarrationVolume(value: number): void;
  setAmbienceVolume(value: number): void;
  toggleCaptions(): void;
  toggleOrbit(): void;
  toggleSpectator(): void;
  exitSpectator(): void;
}>;

export type ShortcutTarget = Readonly<{
  tagName?: string;
  isContentEditable?: boolean;
}>;

export type ShortcutKeyEvent = Readonly<{
  key: string;
  target?: ShortcutTarget | null;
  preventDefault(): void;
}>;

export type ControlsSnapshot = Readonly<{
  state: 'loading' | 'ready' | 'playing' | 'paused' | 'seeking' | 'spectator' | 'ended' | 'failed';
  time: number;
  duration: number;
  muted: boolean;
  master: number;
  narration: number;
  ambience: number;
  captionsVisible: boolean;
  orbitActive: boolean;
  spectatorActive: boolean;
}>;

const INTERACTIVE_TAGS = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function dispatchKeyboardShortcut(
  event: ShortcutKeyEvent,
  actions: ControlActions,
): boolean {
  const target = event.target;
  if (
    target?.isContentEditable
    || INTERACTIVE_TAGS.has(target?.tagName?.toUpperCase() ?? '')
  ) {
    return false;
  }

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  switch (key) {
    case ' ':
    case 'Spacebar':
      void actions.togglePlayback();
      break;
    case 'r':
      void actions.restart();
      break;
    case 'ArrowLeft':
      actions.seekBy(-5);
      break;
    case 'ArrowRight':
      actions.seekBy(5);
      break;
    case 'm':
      actions.toggleMute();
      break;
    case 'c':
      actions.toggleCaptions();
      break;
    case 'o':
      actions.toggleOrbit();
      break;
    case 'Escape':
      actions.exitSpectator();
      break;
    default:
      return false;
  }
  event.preventDefault();
  return true;
}

function actionButton(
  documentRef: Document,
  label: string,
  text: string,
  action: () => void | Promise<void>,
): HTMLButtonElement {
  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = 'control-button';
  button.textContent = text;
  button.setAttribute('aria-label', label);
  button.addEventListener('click', () => { void action(); });
  return button;
}

function volumeInput(
  documentRef: Document,
  label: string,
  action: (value: number) => void,
): HTMLInputElement {
  const input = documentRef.createElement('input');
  input.type = 'range';
  input.className = 'volume-input';
  input.min = '0';
  input.max = '1';
  input.step = '0.01';
  input.setAttribute('aria-label', label);
  input.addEventListener('input', (event) => {
    action((event.currentTarget as HTMLInputElement).valueAsNumber);
  });
  return input;
}

export class Controls {
  private readonly play: HTMLButtonElement;
  private readonly mute: HTMLButtonElement;
  private readonly seek: HTMLInputElement;
  private readonly timer: HTMLOutputElement;
  private readonly master: HTMLInputElement;
  private readonly narration: HTMLInputElement;
  private readonly ambience: HTMLInputElement;
  private readonly captions: HTMLButtonElement;
  private readonly orbit: HTMLButtonElement;
  private readonly spectator: HTMLButtonElement;

  constructor(
    host: HTMLElement,
    actions: ControlActions,
    documentRef: Document = document,
  ) {
    host.className = 'playback-rail-wrap';
    const rail = documentRef.createElement('section');
    rail.className = 'playback-rail';
    rail.setAttribute('aria-label', 'Lantern Hill playback controls');
    rail.setAttribute('data-layout', 'compact');

    const transport = documentRef.createElement('div');
    transport.className = 'playback-rail__transport';
    this.play = actionButton(documentRef, 'Play', 'Play', actions.togglePlayback);
    const restart = actionButton(documentRef, 'Restart', 'Restart', actions.restart);
    transport.append(this.play, restart);

    const timeline = documentRef.createElement('div');
    timeline.className = 'playback-rail__timeline';
    this.seek = documentRef.createElement('input');
    this.seek.type = 'range';
    this.seek.className = 'timeline-input';
    this.seek.min = '0';
    this.seek.max = '0';
    this.seek.step = '0.05';
    this.seek.setAttribute('aria-label', 'Seek through the story');
    this.seek.addEventListener('input', (event) => {
      actions.seekTo((event.currentTarget as HTMLInputElement).valueAsNumber);
    });
    this.timer = documentRef.createElement('output');
    this.timer.className = 'playback-rail__time';
    this.timer.setAttribute('role', 'timer');
    this.timer.setAttribute('aria-live', 'polite');
    timeline.append(this.seek, this.timer);

    const sound = documentRef.createElement('div');
    sound.className = 'playback-rail__sound';
    this.mute = actionButton(documentRef, 'Mute audio', 'Sound', actions.toggleMute);
    this.master = volumeInput(documentRef, 'Master volume', actions.setMasterVolume);
    const audioDetails = documentRef.createElement('details');
    audioDetails.className = 'audio-mix';
    const audioSummary = documentRef.createElement('summary');
    audioSummary.className = 'control-button audio-mix__summary';
    audioSummary.textContent = 'Mix';
    audioSummary.setAttribute('aria-label', 'Open narration and ambience levels');
    const mixBody = documentRef.createElement('div');
    mixBody.className = 'audio-mix__body';
    const narrationLabel = documentRef.createElement('label');
    narrationLabel.textContent = 'Narration';
    this.narration = volumeInput(documentRef, 'Narration volume', actions.setNarrationVolume);
    narrationLabel.append(this.narration);
    const ambienceLabel = documentRef.createElement('label');
    ambienceLabel.textContent = 'Ambience';
    this.ambience = volumeInput(documentRef, 'Ambience volume', actions.setAmbienceVolume);
    ambienceLabel.append(this.ambience);
    mixBody.append(narrationLabel, ambienceLabel);
    audioDetails.append(audioSummary, mixBody);
    sound.append(this.mute, this.master, audioDetails);

    const viewDetails = documentRef.createElement('details');
    viewDetails.className = 'playback-view';
    const viewSummary = documentRef.createElement('summary');
    viewSummary.className = 'control-button playback-view__summary';
    viewSummary.textContent = 'View';
    viewSummary.setAttribute('aria-label', 'Open view controls');
    const view = documentRef.createElement('div');
    view.className = 'playback-rail__view';
    this.captions = actionButton(documentRef, 'Toggle captions', 'Captions', actions.toggleCaptions);
    this.orbit = actionButton(documentRef, 'Toggle orbit camera', 'Orbit', actions.toggleOrbit);
    this.spectator = actionButton(documentRef, 'Toggle spectator mode', 'Explore', actions.toggleSpectator);
    view.append(this.captions, this.orbit, this.spectator);
    viewDetails.append(viewSummary, view);

    rail.append(transport, timeline, sound, viewDetails);
    host.replaceChildren(rail);
  }

  update(snapshot: ControlsSnapshot): void {
    const playing = snapshot.state === 'playing';
    this.play.textContent = playing ? 'Pause' : 'Play';
    this.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    this.seek.max = String(Math.max(0, snapshot.duration));
    this.seek.value = String(Math.max(0, snapshot.time));
    this.timer.textContent = `${formatTime(snapshot.time)} / ${formatTime(snapshot.duration)}`;
    this.mute.textContent = snapshot.muted ? 'Muted' : 'Sound';
    this.mute.setAttribute('aria-label', snapshot.muted ? 'Unmute audio' : 'Mute audio');
    this.mute.setAttribute('aria-pressed', String(snapshot.muted));
    this.master.value = String(snapshot.master);
    this.narration.value = String(snapshot.narration);
    this.ambience.value = String(snapshot.ambience);
    this.captions.setAttribute('aria-pressed', String(snapshot.captionsVisible));
    this.orbit.setAttribute('aria-pressed', String(snapshot.orbitActive));
    this.spectator.setAttribute('aria-pressed', String(snapshot.spectatorActive));
  }
}
