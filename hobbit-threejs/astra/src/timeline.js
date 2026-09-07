export class Timeline {
  constructor(clock, duration) {
    this.clock = clock;
    this.duration = duration;
    this.offset = 0;
    this.anchor = clock.currentTime;
    this.playing = false;
  }
  get time() {
    return Math.max(0, Math.min(this.duration, this.offset + (this.playing ? Math.max(0,this.clock.currentTime - this.anchor) : 0)));
  }
  get ended() { return this.time >= this.duration; }
  play(at = this.clock.currentTime) {
    if (this.playing) return;
    this.anchor = at;
    this.playing = true;
  }
  pause() {
    this.offset = this.time;
    this.playing = false;
  }
  seek(time) {
    this.offset = Math.max(0, Math.min(this.duration, Number.isFinite(time) ? time : 0));
    this.anchor = this.clock.currentTime;
  }
}

export function cueAt(cues, time) {
  return cues.find(cue => time >= cue.start && time < cue.end) ?? null;
}

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, t) => {
  const p = clamp((t - a) / (b - a));
  return p * p * (3 - 2 * p);
};
export const ease = x => x * x * (3 - 2 * x);
