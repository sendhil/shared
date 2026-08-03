import type { LoadingStage } from '../app/LanternHillApp';

const LOADING_MESSAGES: Record<LoadingStage, string> = {
  renderer: 'Preparing the view',
  world: 'Shaping Lantern Hill',
  cast: 'Gathering the hill-folk',
  narration: 'Loading the telling',
  audio: 'Tuning the soundscape',
  ready: 'Lantern Hill is ready',
};

export function loadingMessage(stage: LoadingStage): string {
  return LOADING_MESSAGES[stage];
}

export class BeginOverlay {
  private readonly root: HTMLElement;
  private readonly status: HTMLElement;
  private readonly button: HTMLButtonElement;

  constructor(
    private readonly host: HTMLElement,
    onBegin: () => void | Promise<void>,
    documentRef: Document = document,
  ) {
    host.className = 'begin-layer';
    this.root = documentRef.createElement('section');
    this.root.className = 'begin-card';
    this.root.setAttribute('aria-labelledby', 'begin-title');

    const eyebrow = documentRef.createElement('p');
    eyebrow.className = 'begin-card__eyebrow';
    eyebrow.textContent = 'A cinematic telling';
    const title = documentRef.createElement('h1');
    title.id = 'begin-title';
    title.textContent = 'Lantern Hill';
    const copy = documentRef.createElement('p');
    copy.className = 'begin-card__copy';
    copy.textContent = 'A living hill, a gathering village, and one warning carried through light and sound.';
    const soundNote = documentRef.createElement('p');
    soundNote.className = 'begin-card__sound-note';
    soundNote.textContent = 'Sound is part of the experience. Headphones are welcome.';

    this.status = documentRef.createElement('p');
    this.status.className = 'begin-card__status';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');

    this.button = documentRef.createElement('button');
    this.button.className = 'begin-card__button';
    this.button.type = 'button';
    this.button.disabled = true;
    this.button.textContent = 'Begin Experience';
    this.button.setAttribute('aria-label', 'Begin Experience');
    this.button.addEventListener('click', () => { void onBegin(); });

    this.root.append(eyebrow, title, copy, soundNote, this.status, this.button);
    host.replaceChildren(this.root);
    this.setStage('renderer');
  }

  setStage(stage: LoadingStage): void {
    this.status.textContent = loadingMessage(stage);
    this.button.disabled = stage !== 'ready';
  }

  hide(): void {
    this.root.hidden = true;
    this.host.hidden = true;
  }
}
