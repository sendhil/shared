export type AudioLevels = Readonly<{
  master: number;
  narration: number;
  ambience: number;
}>;

export type AudioBusSnapshot = AudioLevels &
  Readonly<{
    muted: boolean;
    effectiveMaster: number;
  }>;

const DEFAULT_LEVELS: AudioLevels = {
  master: 0.8,
  narration: 0.92,
  ambience: 0.35,
};

function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export class AudioBus {
  private muted = false;
  private levels: { master: number; narration: number; ambience: number };

  constructor(levels: AudioLevels = DEFAULT_LEVELS) {
    this.levels = {
      master: clampLevel(levels.master),
      narration: clampLevel(levels.narration),
      ambience: clampLevel(levels.ambience),
    };
  }

  setMaster(value: number): void {
    this.levels.master = clampLevel(value);
  }

  setNarration(value: number): void {
    this.levels.narration = clampLevel(value);
  }

  setAmbience(value: number): void {
    this.levels.ambience = clampLevel(value);
  }

  setMuted(value: boolean): void {
    this.muted = value;
  }

  snapshot(): AudioBusSnapshot {
    return {
      ...this.levels,
      muted: this.muted,
      effectiveMaster: this.muted ? 0 : this.levels.master,
    };
  }
}
