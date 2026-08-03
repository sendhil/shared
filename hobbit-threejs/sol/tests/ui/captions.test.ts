import { describe, expect, it } from 'vitest';
import { activeCaption, CaptionView, captionContext } from '../../src/ui/Captions';
import type { NarrativeCue } from '../../src/timeline/types';
import { asDocument, asElement, FakeDocument, FakeElement } from './fakeDom';

const cues: NarrativeCue[] = [
  { index: 0, text: 'First.', start: 0, end: 1, progressStart: 0, progressEnd: 1 / 3 },
  { index: 1, text: 'Second.', start: 1, end: 2, progressStart: 1 / 3, progressEnd: 2 / 3 },
  { index: 2, text: 'Third.', start: 2, end: 3, progressStart: 2 / 3, progressEnd: 1 },
];

describe('captions', () => {
  it('selects exactly one canonical caption at a boundary', () => {
    expect(activeCaption(cues, 1)?.text).toBe('Second.');
  });

  it('clamps the ending to the final phrase but rejects out-of-range time', () => {
    expect(activeCaption(cues, 3)?.text).toBe('Third.');
    expect(activeCaption(cues, -0.01)).toBeUndefined();
    expect(activeCaption(cues, 3.01)).toBeUndefined();
  });

  it('returns only adjacent canonical phrases as context', () => {
    expect(captionContext(cues, 0)).toEqual({
      previous: undefined,
      active: cues[0],
      next: cues[1],
    });
    expect(captionContext(cues, 1)).toEqual({
      previous: cues[0],
      active: cues[1],
      next: cues[2],
    });
  });

  it('shows only the active phrase while retaining hidden adjacent context', () => {
    const host = new FakeElement('DIV');
    const view = new CaptionView(asElement(host), cues, asDocument(new FakeDocument()));
    view.update(1);

    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-live')).toBe('polite');
    const previous = host.find('data-caption', 'previous');
    const active = host.find('data-caption', 'active');
    const next = host.find('data-caption', 'next');
    expect(previous?.textContent).toBe('First.');
    expect(previous?.hidden).toBe(true);
    expect(previous?.getAttribute('aria-hidden')).toBe('true');
    expect(active?.textContent).toBe('Second.');
    expect(active?.hidden).toBe(false);
    expect(active?.getAttribute('aria-current')).toBe('true');
    expect(next?.textContent).toBe('Third.');
    expect(next?.hidden).toBe(true);
    expect(next?.getAttribute('aria-hidden')).toBe('true');
    view.setVisible(false);
    expect(host.hidden).toBe(true);
  });
});
