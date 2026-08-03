import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  PointsMaterial,
} from 'three';
import type { QualitySettings } from '../render/quality';
import { randomAt } from '../world/random';

export const PARTICLE_KINDS = Object.freeze([
  'dust',
  'pollen',
  'smoke',
  'firefly',
  'bird',
] as const);

export type ParticleKind = (typeof PARTICLE_KINDS)[number];

export type ParticleFrame = Readonly<{
  positions: readonly number[];
  opacities: readonly number[];
}>;

export type ParticleOpacities = Readonly<Record<ParticleKind, number>>;

export type ParticleSampleOptions = Readonly<{
  kind: ParticleKind;
  seed: number;
  count: number;
  time: number;
}>;

type MutableParticleFrame = {
  positions: Float32Array | number[];
  opacities: Float32Array | number[];
};

const KIND_SEEDS: Record<ParticleKind, number> = {
  dust: 0x2455,
  pollen: 0x4211,
  smoke: 0x7331,
  firefly: 0x9a17,
  bird: 0xbe81,
};

const BASE_COUNTS: Record<ParticleKind, number> = {
  dust: 96,
  pollen: 72,
  smoke: 42,
  firefly: 40,
  bird: 16,
};

const COLORS: Record<ParticleKind, string> = {
  dust: '#D8C59A',
  pollen: '#E0A43A',
  smoke: '#8B9188',
  firefly: '#FFD66B',
  bird: '#20372F',
};

const SIZES: Record<ParticleKind, number> = {
  dust: 0.08,
  pollen: 0.1,
  smoke: 0.26,
  firefly: 0.16,
  bird: 0.22,
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function seedValue(seed: number, kind: ParticleKind, particle: number, channel: number): number {
  return randomAt(seed ^ KIND_SEEDS[kind], particle * 11 + channel);
}

function sampleParticle(
  kind: ParticleKind,
  seed: number,
  particle: number,
  time: number,
): readonly [number, number, number, number] {
  const a = seedValue(seed, kind, particle, 0);
  const b = seedValue(seed, kind, particle, 1);
  const c = seedValue(seed, kind, particle, 2);
  const d = seedValue(seed, kind, particle, 3);
  const phase = d * Math.PI * 2;

  switch (kind) {
    case 'dust': {
      const x = (a - 0.5) * 34 + Math.sin(time * 0.19 + phase) * 0.55;
      const y = 0.7 + positiveModulo(b * 8 + time * (0.035 + c * 0.025), 8);
      const z = (c - 0.5) * 30 + Math.cos(time * 0.13 + phase) * 0.4;
      return [x, y, z, 0.24 + 0.3 * clamp01(Math.sin(time * 0.31 + phase) * 0.5 + 0.5)];
    }
    case 'pollen': {
      const x = (a - 0.5) * 28 + Math.sin(time * 0.34 + phase) * (0.4 + c);
      const y = 0.35 + positiveModulo(b * 4.2 + time * (0.018 + d * 0.02), 4.2);
      const z = (c - 0.5) * 26 + Math.cos(time * 0.27 + phase) * 0.7;
      return [x, y, z, 0.3 + 0.55 * clamp01(Math.sin(time * 0.52 + phase) * 0.5 + 0.5)];
    }
    case 'smoke': {
      const chimney = particle % 3;
      const originX = [-8.5, 1.8, 10.5][chimney];
      const originZ = [-2.5, -5.8, 4.2][chimney];
      const rise = positiveModulo(b * 7 + time * (0.18 + c * 0.08), 7);
      const spread = 0.18 + rise * 0.11;
      return [
        originX + Math.sin(time * 0.28 + phase) * spread,
        4.4 + rise,
        originZ + Math.cos(time * 0.21 + phase) * spread,
        clamp01(0.62 * (1 - rise / 7)),
      ];
    }
    case 'firefly': {
      const x = (a - 0.5) * 24 + Math.sin(time * 0.42 + phase) * 0.9;
      const y = 0.45 + b * 3.8 + Math.sin(time * 0.31 + phase) * 0.35;
      const z = (c - 0.5) * 20 + Math.cos(time * 0.37 + phase) * 0.7;
      const blink = Math.pow(clamp01(Math.sin(time * (0.9 + d) + phase) * 0.5 + 0.5), 3);
      return [x, y, z, blink];
    }
    case 'bird': {
      const travel = positiveModulo(a + time * (0.006 + d * 0.004), 1);
      const x = -32 + travel * 64;
      const y = 14 + b * 9 + Math.sin(time * 0.35 + phase) * 0.25;
      const z = (c - 0.5) * 34 + Math.sin(travel * Math.PI * 2 + phase) * 2;
      return [x, y, z, 0.45 + b * 0.45];
    }
  }
}

function fillParticleFrame(
  options: ParticleSampleOptions,
  target: MutableParticleFrame,
): void {
  const count = Math.max(0, Math.floor(Number.isFinite(options.count) ? options.count : 0));
  const time = Number.isFinite(options.time) ? options.time : 0;
  for (let index = 0; index < count; index += 1) {
    const [x, y, z, opacity] = sampleParticle(
      options.kind,
      options.seed,
      index,
      time,
    );
    const offset = index * 3;
    target.positions[offset] = x;
    target.positions[offset + 1] = y;
    target.positions[offset + 2] = z;
    target.opacities[index] = clamp01(opacity);
  }
}

export function sampleParticleFrame(options: ParticleSampleOptions): ParticleFrame {
  const count = Math.max(0, Math.floor(Number.isFinite(options.count) ? options.count : 0));
  const positions = new Array<number>(count * 3).fill(0);
  const opacities = new Array<number>(count).fill(0);
  fillParticleFrame({ ...options, count }, { positions, opacities });
  return Object.freeze({
    positions: Object.freeze(positions),
    opacities: Object.freeze(opacities),
  });
}

type ParticleField = Readonly<{
  kind: ParticleKind;
  points: Points<BufferGeometry, PointsMaterial>;
  positions: Float32Array;
  opacities: Float32Array;
  count: number;
}>;

export type ParticleSystem = Readonly<{
  group: Group;
  fields: readonly ParticleField[];
  evaluate(time: number, opacities: ParticleOpacities): void;
  dispose(): void;
}>;

export type CreateParticleSystemOptions = Readonly<{
  quality: QualitySettings;
  seed?: number;
}>;

export function createParticleSystem(options: CreateParticleSystemOptions): ParticleSystem {
  const seed = options.seed ?? 111;
  const group = new Group();
  group.name = 'effects:particles';

  const fields = PARTICLE_KINDS.map((kind, index): ParticleField => {
    const count = Math.max(1, Math.round(BASE_COUNTS[kind] * options.quality.particleDensity));
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    fillParticleFrame({ kind, seed, count, time: 0 }, { positions, opacities });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: COLORS[kind],
      size: SIZES[kind],
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const points = new Points(geometry, material);
    points.name = `effect:particles:${kind}`;
    points.frustumCulled = true;
    points.renderOrder = 20 + index;
    points.visible = false;
    group.add(points);
    return Object.freeze({ kind, points, positions, opacities, count });
  });

  let disposed = false;
  return Object.freeze({
    group,
    fields: Object.freeze(fields),
    evaluate: (time: number, opacities: ParticleOpacities) => {
      for (const field of fields) {
        fillParticleFrame(
          { kind: field.kind, seed, count: field.count, time },
          { positions: field.positions, opacities: field.opacities },
        );
        const opacity = clamp01(opacities[field.kind]);
        field.points.material.opacity = opacity;
        field.points.visible = opacity > 0.001;
        field.points.geometry.attributes.position.needsUpdate = true;
      }
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const field of fields) {
        field.points.geometry.dispose();
        field.points.material.dispose();
      }
      group.clear();
    },
  });
}
