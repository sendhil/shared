import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  SRGBColorSpace,
} from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createRenderer, detectWebGLSupport } from '../../src/render/Renderer';
import { QUALITY_TIERS, chooseQuality } from '../../src/render/quality';

describe('render quality selection', () => {
  it('caps expensive rendering on constrained devices', () => {
    const quality = chooseQuality({
      devicePixelRatio: 3,
      hardwareConcurrency: 4,
    });

    expect(quality.name).toBe('medium');
    expect(quality.pixelRatio).toBeLessThanOrEqual(1.5);
    expect(quality.shadowMapSize).toBe(1024);
    expect(quality.particleDensity).toBeLessThan(1);
  });

  it('selects deterministic low, medium, and high profiles', () => {
    expect(chooseQuality({ devicePixelRatio: 2, hardwareConcurrency: 2 }).name).toBe('low');
    expect(chooseQuality({ devicePixelRatio: 2, hardwareConcurrency: 6 }).name).toBe('medium');
    expect(chooseQuality({ devicePixelRatio: 2, hardwareConcurrency: 12 }).name).toBe('high');
    expect(chooseQuality({
      devicePixelRatio: 4,
      hardwareConcurrency: 2,
      preference: 'high',
    })).toEqual(QUALITY_TIERS.high);
  });
});

describe('renderer configuration', () => {
  it('uses cinematic color, tone mapping, shadows, and allocation-free repeated resize', () => {
    const setSize = vi.fn();
    const setPixelRatio = vi.fn();
    const dispose = vi.fn();
    const backend = {
      outputColorSpace: '',
      toneMapping: 0,
      toneMappingExposure: 0,
      shadowMap: { enabled: false, type: 0, autoUpdate: false },
      setSize,
      setPixelRatio,
      render: vi.fn(),
      dispose,
    };
    let antialias: boolean | undefined;
    const canvas = { getContext: () => ({}) } as unknown as HTMLCanvasElement;
    const quality = chooseQuality({
      devicePixelRatio: 3,
      hardwareConcurrency: 4,
    });

    const handle = createRenderer(canvas, {
      quality,
      rendererFactory: (parameters) => {
        antialias = parameters.antialias;
        return backend;
      },
    });

    expect(handle.supported).toBe(true);
    if (!handle.supported) throw new Error('expected a configured renderer');
    expect(antialias).toBe(quality.antialias);
    expect(handle.renderer.outputColorSpace).toBe(SRGBColorSpace);
    expect(handle.renderer.toneMapping).toBe(ACESFilmicToneMapping);
    expect(handle.renderer.toneMappingExposure).toBeCloseTo(1.06);
    expect(handle.renderer.shadowMap).toEqual({
      enabled: true,
      type: PCFSoftShadowMap,
      autoUpdate: true,
    });

    handle.resize(1440, 900, 3);
    handle.resize(1440, 900, 3);
    expect(setSize).toHaveBeenCalledTimes(1);
    expect(setSize).toHaveBeenLastCalledWith(1440, 900, false);
    expect(setPixelRatio).toHaveBeenCalledTimes(1);
    expect(setPixelRatio).toHaveBeenLastCalledWith(quality.pixelRatio);

    handle.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('reports a usable fallback when WebGL is unavailable', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;

    expect(detectWebGLSupport(canvas)).toEqual({
      supported: false,
      reason: 'WebGL is unavailable in this browser.',
    });
    const handle = createRenderer(canvas, {
      quality: QUALITY_TIERS.low,
      rendererFactory: () => {
        throw new Error('context creation failed');
      },
    });
    expect(handle).toMatchObject({
      supported: false,
      reason: 'context creation failed',
    });
    expect(() => handle.dispose()).not.toThrow();
  });
});
