export interface NarrationMediaElement {
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  preload: string;
  src: string;
  hidden: boolean;
  load(): void;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

export interface NarrationSourceNode {
  connect(destination: unknown): unknown;
}

export interface NarrationAudioContext<TMedia extends NarrationMediaElement> {
  createMediaElementSource(media: TMedia): NarrationSourceNode;
}

export class NarrationLoadError extends Error {
  override readonly name = 'NarrationLoadError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

const SOURCES = ['./audio/narration.m4a', './audio/narration.mp3'] as const;

export class NarrationPlayer<TMedia extends NarrationMediaElement = HTMLAudioElement> {
  private readonly media: TMedia;
  private loading: Promise<number> | undefined;
  private loadedDuration: number | undefined;

  constructor(
    audioContext: NarrationAudioContext<TMedia>,
    narrationGain: unknown,
    createMedia: () => TMedia = () => document.createElement('audio') as unknown as TMedia,
  ) {
    this.media = createMedia();
    this.media.hidden = true;
    this.media.preload = 'metadata';
    audioContext.createMediaElementSource(this.media).connect(narrationGain);
  }

  get currentTime(): number {
    return this.media.currentTime;
  }

  set currentTime(value: number) {
    this.media.currentTime = value;
  }

  get duration(): number {
    return this.media.duration;
  }

  get paused(): boolean {
    return this.media.paused;
  }

  async load(): Promise<number> {
    if (this.loadedDuration !== undefined) return this.loadedDuration;
    if (this.loading) return this.loading;

    this.loading = this.loadSources().finally(() => {
      this.loading = undefined;
    });
    return this.loading;
  }

  play(): Promise<void> {
    return this.media.play();
  }

  pause(): void {
    this.media.pause();
  }

  private async loadSources(): Promise<number> {
    let lastError: unknown;
    for (const source of SOURCES) {
      try {
        const duration = await this.loadSource(source);
        this.loadedDuration = duration;
        return duration;
      } catch (error) {
        lastError = error;
      }
    }

    throw new NarrationLoadError(
      'Unable to load narration metadata with a positive finite duration',
      { cause: lastError },
    );
  }

  private loadSource(source: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.media.removeEventListener('loadedmetadata', onMetadata);
        this.media.removeEventListener('error', onError);
      };
      const onMetadata = () => {
        cleanup();
        if (!Number.isFinite(this.media.duration) || this.media.duration <= 0) {
          reject(new Error(`Narration source ${source} did not report a positive finite duration`));
          return;
        }
        resolve(this.media.duration);
      };
      const onError = () => {
        cleanup();
        reject(new Error(`Narration source ${source} failed to load`));
      };

      this.media.addEventListener('loadedmetadata', onMetadata);
      this.media.addEventListener('error', onError);
      this.media.src = source;
      this.media.load();
    });
  }
}
