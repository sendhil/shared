import type { NarrationSnapshot } from '../audio/SpeechNarrator';

export type PlaybackActions = {
  begin: () => Promise<void>;
  toggle: () => Promise<void>;
  restart: () => Promise<void>;
  seek: (ratio: number) => void;
  mute: () => void;
  master: (value: number) => void;
  narration: (value: number) => void;
  ambience: (value: number) => void;
  captions: (enabled: boolean) => void;
  spectator: (enabled: boolean) => void;
};

const createButton = (label: string, className = ''): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
};

const createRange = (label: string, value: number): { label: HTMLLabelElement; input: HTMLInputElement } => {
  const wrapper = document.createElement('label');
  wrapper.className = 'meter';
  const text = document.createElement('span');
  text.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '1';
  input.step = '0.01';
  input.value = String(value);
  wrapper.append(text, input);
  return { label: wrapper, input };
};

const clock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export class PlaybackUI {
  private readonly root = document.createElement('aside');
  private readonly gate = document.createElement('section');
  private readonly status = document.createElement('p');
  private readonly caption = document.createElement('p');
  private readonly beginButton = createButton('Begin experience', 'begin-button');
  private readonly playButton = createButton('Play');
  private readonly restartButton = createButton('Restart');
  private readonly muteButton = createButton('Mute');
  private readonly seek = document.createElement('input');
  private readonly time = document.createElement('span');
  private readonly master = createRange('Master', 0.86);
  private readonly narration = createRange('Voice', 0.92);
  private readonly ambience = createRange('Ambience', 0.28);
  private readonly captions = document.createElement('input');
  private readonly spectator = document.createElement('input');
  private captionsVisible = false;
  private muted = false;
  private started = false;

  constructor(parent: HTMLElement, actions: PlaybackActions) {
    this.root.className = 'playback-shell';
    this.root.setAttribute('aria-label', 'Cinematic experience controls');
    this.gate.className = 'experience-gate';
    const overline = document.createElement('span');
    overline.className = 'eyebrow';
    overline.textContent = 'A story told in a hillside valley';
    const title = document.createElement('h1');
    title.textContent = 'The Hill Keeps Its Secrets';
    const introduction = document.createElement('p');
    introduction.textContent = 'Begin with sound on for the narrated journey.';
    this.gate.append(overline, title, introduction, this.beginButton);

    const transport = document.createElement('section');
    transport.className = 'transport';
    const playGroup = document.createElement('div');
    playGroup.className = 'play-group';
    playGroup.append(this.playButton, this.restartButton, this.muteButton);
    const seekWrap = document.createElement('label');
    seekWrap.className = 'seek-wrap';
    const label = document.createElement('span');
    label.textContent = 'Story progress';
    this.seek.type = 'range';
    this.seek.min = '0';
    this.seek.max = '1';
    this.seek.step = '0.001';
    this.seek.value = '0';
    this.seek.setAttribute('aria-label', 'Story progress');
    this.time.className = 'timecode';
    seekWrap.append(label, this.seek);
    const toggles = document.createElement('div');
    toggles.className = 'toggles';
    this.captions.type = 'checkbox';
    this.spectator.type = 'checkbox';
    const captionLabel = document.createElement('label');
    captionLabel.append(this.captions, document.createTextNode(' Captions'));
    const spectatorLabel = document.createElement('label');
    spectatorLabel.append(this.spectator, document.createTextNode(' Explore'));
    toggles.append(captionLabel, spectatorLabel);
    const levels = document.createElement('div');
    levels.className = 'levels';
    levels.append(this.master.label, this.narration.label, this.ambience.label);
    transport.append(playGroup, seekWrap, this.time, toggles, levels);

    this.status.className = 'playback-status';
    this.status.setAttribute('role', 'status');
    this.caption.className = 'caption-line';
    this.caption.hidden = true;
    this.root.append(this.gate, this.caption, transport, this.status);
    parent.append(this.root);

    this.beginButton.addEventListener('click', async () => {
      await actions.begin();
      this.started = true;
      this.gate.classList.add('gate-dismissed');
    });
    this.playButton.addEventListener('click', () => void actions.toggle());
    this.restartButton.addEventListener('click', () => void actions.restart());
    this.muteButton.addEventListener('click', () => {
      this.muted = !this.muted;
      this.muteButton.textContent = this.muted ? 'Unmute' : 'Mute';
      actions.mute();
    });
    this.seek.addEventListener('input', () => actions.seek(Number(this.seek.value)));
    this.master.input.addEventListener('input', () => actions.master(Number(this.master.input.value)));
    this.narration.input.addEventListener('input', () => actions.narration(Number(this.narration.input.value)));
    this.ambience.input.addEventListener('input', () => actions.ambience(Number(this.ambience.input.value)));
    this.captions.addEventListener('change', () => {
      this.captionsVisible = this.captions.checked;
      actions.captions(this.captionsVisible);
    });
    this.spectator.addEventListener('change', () => actions.spectator(this.spectator.checked));
  }

  render(snapshot: NarrationSnapshot): void {
    this.seek.value = String(snapshot.progress || 0);
    this.time.textContent = `${clock(snapshot.time)} / ${clock(snapshot.duration)}`;
    this.playButton.textContent = snapshot.state === 'playing' ? 'Pause' : 'Play';
    this.playButton.disabled = snapshot.state === 'loading' || snapshot.state === 'error';
    this.beginButton.disabled = snapshot.state === 'loading' || snapshot.state === 'error';
    this.caption.hidden = !this.captionsVisible || !snapshot.cue;
    this.caption.textContent = snapshot.cue?.text ?? '';
    const voice = snapshot.voiceName ? `Voice: ${snapshot.voiceName}` : 'Finding a storyteller…';
    const transport = snapshot.source === 'media'
      ? 'Local narration file · precise media seeking.'
      : 'Live voice mode · seeking restarts the selected phrase.';
    this.status.textContent = snapshot.error ?? `${voice} · ${transport}`;
    if (snapshot.state === 'error') this.gate.classList.remove('gate-dismissed');
    if (!this.started && snapshot.state === 'ready') this.beginButton.textContent = 'Begin experience';
  }

  setError(message: string): void {
    this.status.textContent = message;
    this.gate.classList.remove('gate-dismissed');
  }
}
