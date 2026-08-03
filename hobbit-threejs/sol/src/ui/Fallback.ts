import { PASSAGE } from '../content/passage';
import type { NarrativeCue } from '../timeline/types';

export type FallbackKind = 'webgl' | 'narration' | 'runtime';

export type FallbackViewModel = Readonly<{
  kind: FallbackKind;
  title: string;
  guidance: string;
  detail: string;
  passage: string;
  canRetry: boolean;
  canUseSpeech: boolean;
  canPlayNarration: boolean;
}>;

export function fallbackViewModel(
  kind: FallbackKind,
  detail = '',
): FallbackViewModel {
  if (kind === 'webgl') {
    return {
      kind,
      title: 'Lantern Hill can still be heard',
      guidance: 'WebGL is unavailable. Try a current browser with hardware acceleration to see the cinematic world; the complete passage remains available here.',
      detail,
      passage: PASSAGE,
      canRetry: false,
      canUseSpeech: false,
      canPlayNarration: true,
    };
  }
  if (kind === 'narration') {
    return {
      kind,
      title: 'Narration needs another route',
      guidance: 'Retry the local recording or use browser speech. Seeking with browser speech restarts at the nearest phrase.',
      detail,
      passage: PASSAGE,
      canRetry: true,
      canUseSpeech: true,
      canPlayNarration: false,
    };
  }
  return {
    kind,
    title: 'The experience stopped',
    guidance: 'Reload Lantern Hill to rebuild the world. The complete passage remains available here.',
    detail,
    passage: PASSAGE,
    canRetry: true,
    canUseSpeech: false,
    canPlayNarration: false,
  };
}

export function nearestSpeechCue(
  cues: readonly NarrativeCue[],
  time: number,
): NarrativeCue | undefined {
  if (cues.length === 0) return undefined;
  const target = Number.isFinite(time) ? time : 0;
  return cues.reduce((nearest, cue) =>
    Math.abs(cue.start - target) < Math.abs(nearest.start - target)
      ? cue
      : nearest
  );
}

export type FallbackActions = Readonly<{
  playNarration(): void | Promise<void>;
  pauseNarration(): void;
  retry(): void | Promise<void>;
  useSpeech(): void;
}>;

export class Fallback {
  constructor(
    private readonly host: HTMLElement,
    private readonly actions: FallbackActions,
    private readonly documentRef: Document = document,
  ) {
    host.className = 'fallback-layer';
    host.hidden = true;
  }

  show(kind: FallbackKind, detail = ''): void {
    const model = fallbackViewModel(kind, detail);
    const panel = this.documentRef.createElement('section');
    panel.className = 'fallback-card';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'fallback-title');
    const title = this.documentRef.createElement('h1');
    title.id = 'fallback-title';
    title.textContent = model.title;
    const guidance = this.documentRef.createElement('p');
    guidance.className = 'fallback-card__guidance';
    guidance.textContent = model.guidance;
    const detailText = this.documentRef.createElement('p');
    detailText.className = 'fallback-card__detail';
    detailText.textContent = model.detail;
    detailText.hidden = model.detail.length === 0;
    const actions = this.documentRef.createElement('div');
    actions.className = 'fallback-card__actions';

    if (model.canPlayNarration) {
      actions.append(this.button('Play narration', 'Play narration', this.actions.playNarration));
      actions.append(this.button('Pause narration', 'Pause narration', this.actions.pauseNarration));
    }
    if (model.canRetry) {
      actions.append(this.button('Retry narration', 'Retry', this.actions.retry));
    }
    if (model.canUseSpeech) {
      actions.append(this.button('Use browser speech', 'Use browser speech', this.actions.useSpeech));
    }

    const passage = this.documentRef.createElement('article');
    passage.className = 'fallback-card__passage';
    passage.setAttribute('data-fallback-passage', 'true');
    passage.textContent = model.passage;
    panel.append(title, guidance, detailText, actions, passage);
    this.host.replaceChildren(panel);
    this.host.hidden = false;
  }

  hide(): void {
    this.host.hidden = true;
  }

  private button(
    label: string,
    text: string,
    action: () => void | Promise<void>,
  ): HTMLButtonElement {
    const button = this.documentRef.createElement('button');
    button.type = 'button';
    button.className = 'fallback-card__button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => { void action(); });
    return button;
  }
}

export type SpeechUtteranceLike = {
  text: string;
  rate: number;
  pitch: number;
  volume: number;
};

export type SpeechSynthesisLike<TUtterance extends SpeechUtteranceLike> = Readonly<{
  cancel(): void;
  speak(utterance: TUtterance): void;
}>;

export class SpeechFallback<TUtterance extends SpeechUtteranceLike> {
  constructor(
    private readonly cues: readonly NarrativeCue[],
    private readonly synthesis: SpeechSynthesisLike<TUtterance>,
    private readonly createUtterance: (text: string) => TUtterance,
  ) {}

  startAt(time: number): NarrativeCue | undefined {
    const cue = nearestSpeechCue(this.cues, time);
    if (!cue) return undefined;
    const position = this.cues.indexOf(cue);
    const utterance = this.createUtterance(
      this.cues.slice(position).map((part) => part.text).join(' '),
    );
    utterance.rate = 0.9;
    utterance.pitch = 0.98;
    utterance.volume = 1;
    this.synthesis.cancel();
    this.synthesis.speak(utterance);
    return cue;
  }
}

export class SpeechMediaClock {
  private baseTime = 0;
  private anchorMilliseconds = 0;
  private isPaused = true;

  constructor(
    readonly duration: number,
    private readonly now: () => number = () => performance.now(),
  ) {
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new RangeError('speech fallback duration must be positive');
    }
    this.anchorMilliseconds = this.now();
  }

  get currentTime(): number {
    const elapsed = this.isPaused ? 0 : (this.now() - this.anchorMilliseconds) / 1_000;
    return Math.min(this.duration, Math.max(0, this.baseTime + elapsed));
  }

  set currentTime(value: number) {
    const safe = Number.isFinite(value) ? value : 0;
    this.baseTime = Math.min(this.duration, Math.max(0, safe));
    this.anchorMilliseconds = this.now();
  }

  get paused(): boolean {
    return this.isPaused;
  }

  async play(): Promise<void> {
    this.baseTime = this.currentTime;
    this.anchorMilliseconds = this.now();
    this.isPaused = false;
  }

  pause(): void {
    this.baseTime = this.currentTime;
    this.anchorMilliseconds = this.now();
    this.isPaused = true;
  }
}
