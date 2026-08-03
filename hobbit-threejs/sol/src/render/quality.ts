export type QualityName = 'low' | 'medium' | 'high';
export type QualityPreference = 'auto' | QualityName;

export type QualitySettings = Readonly<{
  name: QualityName;
  pixelRatio: number;
  antialias: boolean;
  shadowMapSize: 1024 | 2048;
  particleDensity: number;
}>;

export type QualityCapabilities = Readonly<{
  devicePixelRatio: number;
  hardwareConcurrency: number;
  preference?: QualityPreference;
}>;

export const QUALITY_TIERS = Object.freeze({
  low: Object.freeze({
    name: 'low',
    pixelRatio: 1,
    antialias: false,
    shadowMapSize: 1024,
    particleDensity: 0.45,
  }),
  medium: Object.freeze({
    name: 'medium',
    pixelRatio: 1.5,
    antialias: true,
    shadowMapSize: 1024,
    particleDensity: 0.72,
  }),
  high: Object.freeze({
    name: 'high',
    pixelRatio: 2,
    antialias: true,
    shadowMapSize: 2048,
    particleDensity: 1,
  }),
} satisfies Record<QualityName, QualitySettings>);

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function chooseQuality(capabilities: QualityCapabilities): QualitySettings {
  const preference = capabilities.preference ?? 'auto';
  if (preference !== 'auto') return QUALITY_TIERS[preference];

  const cores = Math.max(1, finiteOr(capabilities.hardwareConcurrency, 4));
  const pixelRatio = Math.max(0.5, finiteOr(capabilities.devicePixelRatio, 1));
  if (cores <= 2) return QUALITY_TIERS.low;
  if (cores >= 8 && pixelRatio <= 2.5) return QUALITY_TIERS.high;
  return QUALITY_TIERS.medium;
}

export function browserQualityCapabilities(
  preference: QualityPreference = 'auto',
): QualityCapabilities {
  return {
    devicePixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
    hardwareConcurrency: typeof navigator === 'undefined'
      ? 4
      : navigator.hardwareConcurrency,
    preference,
  };
}
