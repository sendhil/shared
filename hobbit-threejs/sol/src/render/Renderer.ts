import {
  ACESFilmicToneMapping,
  Camera,
  PCFSoftShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type WebGLRendererParameters,
} from 'three';
import {
  browserQualityCapabilities,
  chooseQuality,
  type QualityPreference,
  type QualitySettings,
} from './quality';

export type RendererBackend = {
  outputColorSpace: string;
  toneMapping: number;
  toneMappingExposure: number;
  shadowMap: {
    enabled: boolean;
    type: number;
    autoUpdate: boolean;
  };
  setSize(width: number, height: number, updateStyle?: boolean): void;
  setPixelRatio(value: number): void;
  render(scene: Scene, camera: Camera): void;
  dispose(): void;
};

export type RendererFactory = (
  parameters: WebGLRendererParameters,
) => RendererBackend;

export type RendererSupport = Readonly<
  | { supported: true }
  | { supported: false; reason: string }
>;

export type ReadyRenderer = Readonly<{
  supported: true;
  renderer: RendererBackend;
  quality: QualitySettings;
  resize(width: number, height: number, devicePixelRatio?: number): void;
  dispose(): void;
}>;

export type UnavailableRenderer = Readonly<{
  supported: false;
  reason: string;
  quality: QualitySettings;
  dispose(): void;
}>;

export type RendererHandle = ReadyRenderer | UnavailableRenderer;

export type CreateRendererOptions = Readonly<{
  quality?: QualitySettings;
  preference?: QualityPreference;
  rendererFactory?: RendererFactory;
}>;

const WEBGL_UNAVAILABLE = 'WebGL is unavailable in this browser.';

export function detectWebGLSupport(canvas: HTMLCanvasElement): RendererSupport {
  try {
    const context = canvas.getContext('webgl2')
      ?? canvas.getContext('webgl')
      ?? canvas.getContext('experimental-webgl');
    return context
      ? { supported: true }
      : { supported: false, reason: WEBGL_UNAVAILABLE };
  } catch {
    return { supported: false, reason: WEBGL_UNAVAILABLE };
  }
}

function errorReason(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : 'WebGL renderer initialization failed.';
}

function unavailable(reason: string, quality: QualitySettings): UnavailableRenderer {
  return Object.freeze({
    supported: false,
    reason,
    quality,
    dispose: () => undefined,
  });
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  options: CreateRendererOptions = {},
): RendererHandle {
  const quality = options.quality ?? chooseQuality(
    browserQualityCapabilities(options.preference),
  );
  const injectedFactory = options.rendererFactory;
  if (!injectedFactory) {
    const support = detectWebGLSupport(canvas);
    if (!support.supported) return unavailable(support.reason, quality);
  }

  let renderer: RendererBackend;
  try {
    const factory = injectedFactory
      ?? ((parameters: WebGLRendererParameters) => new WebGLRenderer(parameters));
    renderer = factory({
      canvas,
      alpha: false,
      antialias: quality.antialias,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
  } catch (error) {
    return unavailable(errorReason(error), quality);
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;

  let width = -1;
  let height = -1;
  let pixelRatio = -1;
  let disposed = false;

  return Object.freeze({
    supported: true,
    renderer,
    quality,
    resize: (
      nextWidth: number,
      nextHeight: number,
      devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio,
    ) => {
      const safeWidth = Math.max(1, Math.floor(Number.isFinite(nextWidth) ? nextWidth : 1));
      const safeHeight = Math.max(1, Math.floor(Number.isFinite(nextHeight) ? nextHeight : 1));
      const safeDeviceRatio = Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
      const nextPixelRatio = Math.min(quality.pixelRatio, Math.max(0.5, safeDeviceRatio));
      if (nextPixelRatio !== pixelRatio) {
        renderer.setPixelRatio(nextPixelRatio);
        pixelRatio = nextPixelRatio;
      }
      if (safeWidth !== width || safeHeight !== height) {
        renderer.setSize(safeWidth, safeHeight, false);
        width = safeWidth;
        height = safeHeight;
      }
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      renderer.dispose();
    },
  });
}
