const UINT32_RANGE = 4_294_967_296;

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new RangeError('seed must be finite');
  return Math.trunc(seed) >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = normalizeSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function randomAt(seed: number, index: number): number {
  let value = normalizeSeed(seed) ^ Math.imul(Math.trunc(index) + 1, 0x9e3779b1);
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / UINT32_RANGE;
}

export function randomRange(seed: number, index: number, min: number, max: number): number {
  return min + (max - min) * randomAt(seed, index);
}

function smoothstep01(value: number): number {
  return value * value * (3 - 2 * value);
}

function lattice(seed: number, x: number, y: number): number {
  const mixed = normalizeSeed(seed) ^ Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495);
  return randomAt(mixed, x ^ (y << 8)) * 2 - 1;
}

export function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep01(x - x0);
  const ty = smoothstep01(y - y0);
  const top = lattice(seed, x0, y0) * (1 - tx) + lattice(seed, x0 + 1, y0) * tx;
  const bottom = lattice(seed, x0, y0 + 1) * (1 - tx) + lattice(seed, x0 + 1, y0 + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}
