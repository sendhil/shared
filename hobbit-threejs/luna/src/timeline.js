import { getStoryState } from './story.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createStoryClock({ duration, onState = () => {} }) {
  const total = Number.isFinite(duration) && duration > 0 ? duration : 120;
  let time = 0;
  let playing = false;
  let lastNow = null;
  let state = getStoryState(time, playing);

  const emit = () => {
    state = getStoryState(time, playing);
    onState(state);
    return state;
  };

  return {
    play(now = performance.now() / 1000) {
      if (time >= total) time = 0;
      playing = true;
      lastNow = now;
      return emit();
    },
    pause() {
      playing = false;
      lastNow = null;
      return emit();
    },
    restart(now = performance.now() / 1000) {
      time = 0;
      playing = true;
      lastNow = now;
      return emit();
    },
    seek(nextTime) {
      time = clamp(Number(nextTime) || 0, 0, total);
      lastNow = null;
      return emit();
    },
    update(now = performance.now() / 1000) {
      if (playing) {
        if (lastNow === null) lastNow = now;
        else {
          time += Math.max(0, now - lastNow);
          lastNow = now;
        }
        if (time >= total) {
          time = total;
          playing = false;
          lastNow = null;
        }
      }
      return emit();
    },
    getState() {
      return state;
    },
  };
}
