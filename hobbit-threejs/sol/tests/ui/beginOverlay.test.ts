import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { BeginOverlay, loadingMessage } from '../../src/ui/BeginOverlay';
import { asDocument, asElement, FakeDocument, FakeElement } from './fakeDom';

describe('begin overlay status', () => {
  it.each([
    ['renderer', 'Preparing the view'],
    ['world', 'Shaping Lantern Hill'],
    ['cast', 'Gathering the hill-folk'],
    ['narration', 'Loading the telling'],
    ['audio', 'Tuning the soundscape'],
    ['ready', 'Lantern Hill is ready'],
  ] as const)('describes %s without a fabricated percentage', (stage, message) => {
    expect(loadingMessage(stage)).toBe(message);
    expect(loadingMessage(stage)).not.toContain('%');
  });

  it('keeps Begin disabled until every loading stage is ready', () => {
    const host = new FakeElement('DIV');
    const onBegin = vi.fn();
    const overlay = new BeginOverlay(asElement(host), onBegin, asDocument(new FakeDocument()));
    const button = host.find('aria-label', 'Begin Experience');
    const status = host.find('role', 'status');

    expect(button?.disabled).toBe(true);
    expect(status?.getAttribute('aria-live')).toBe('polite');
    overlay.setStage('ready');
    expect(button?.disabled).toBe(false);
    button?.emit('click');
    expect(onBegin).toHaveBeenCalledOnce();
    overlay.hide();
    expect(host.hidden).toBe(true);
  });
});
