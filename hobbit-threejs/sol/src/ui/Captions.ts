import type { NarrativeCue } from '../timeline/types';

export type CaptionContext = Readonly<{
  previous: NarrativeCue | undefined;
  active: NarrativeCue;
  next: NarrativeCue | undefined;
}>;

export function activeCaption(
  cues: readonly NarrativeCue[],
  time: number,
): NarrativeCue | undefined {
  if (!Number.isFinite(time) || cues.length === 0) return undefined;
  return cues.find((cue, index) =>
    time >= cue.start
    && (time < cue.end || (index === cues.length - 1 && time === cue.end))
  );
}

export function captionContext(
  cues: readonly NarrativeCue[],
  time: number,
): CaptionContext | undefined {
  const active = activeCaption(cues, time);
  if (!active) return undefined;
  const position = cues.indexOf(active);
  return {
    previous: position > 0 ? cues[position - 1] : undefined,
    active,
    next: position < cues.length - 1 ? cues[position + 1] : undefined,
  };
}

export class CaptionView {
  private readonly previous: HTMLElement;
  private readonly active: HTMLElement;
  private readonly next: HTMLElement;

  constructor(
    private readonly host: HTMLElement,
    private readonly cues: readonly NarrativeCue[],
    documentRef: Document = document,
  ) {
    host.className = 'caption-stage';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-atomic', 'true');
    host.setAttribute('aria-label', 'Narration captions');

    this.previous = documentRef.createElement('p');
    this.previous.className = 'caption-stage__context caption-stage__context--previous';
    this.previous.setAttribute('data-caption', 'previous');
    this.previous.setAttribute('aria-hidden', 'true');
    this.previous.hidden = true;
    this.active = documentRef.createElement('p');
    this.active.className = 'caption-stage__active';
    this.active.setAttribute('data-caption', 'active');
    this.active.setAttribute('aria-current', 'true');
    this.active.hidden = true;
    this.next = documentRef.createElement('p');
    this.next.className = 'caption-stage__context caption-stage__context--next';
    this.next.setAttribute('data-caption', 'next');
    this.next.setAttribute('aria-hidden', 'true');
    this.next.hidden = true;
    host.replaceChildren(this.previous, this.active, this.next);
  }

  update(time: number): void {
    const context = captionContext(this.cues, time);
    this.previous.textContent = context?.previous?.text ?? '';
    this.previous.hidden = true;
    this.active.textContent = context?.active.text ?? '';
    this.active.hidden = !context;
    this.next.textContent = context?.next?.text ?? '';
    this.next.hidden = true;
  }

  setVisible(visible: boolean): void {
    this.host.hidden = !visible;
  }
}
