import { expect, it, vi } from 'vitest';
import { projectAudioSnapshot } from '../../src/app/AudioProjection';

it('projects mute and all three buses onto concrete gain parameters', () => {
  const master = { setTargetAtTime: vi.fn() };
  const narration = { setTargetAtTime: vi.fn() };
  const ambience = { setTargetAtTime: vi.fn() };

  projectAudioSnapshot(
    { master: 0.8, narration: 0.9, ambience: 0.3, muted: true, effectiveMaster: 0 },
    { master, narration, ambience },
    12,
  );

  expect(master.setTargetAtTime).toHaveBeenCalledWith(0, 12, 0.025);
  expect(narration.setTargetAtTime).toHaveBeenCalledWith(0.9, 12, 0.025);
  expect(ambience.setTargetAtTime).toHaveBeenCalledWith(0.3, 12, 0.025);
});
