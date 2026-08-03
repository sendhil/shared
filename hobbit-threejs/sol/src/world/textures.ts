import {
  CanvasTexture,
  DataTexture,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
} from 'three';
import { randomAt, valueNoise2D } from './random';

export const PROCEDURAL_TEXTURE_SIZE = 256;
export const TEXTURE_KINDS = Object.freeze(['plaster', 'soil', 'wood', 'roof', 'paper'] as const);
export type TextureKind = (typeof TEXTURE_KINDS)[number];
export type ProceduralTextureSet = Readonly<Record<TextureKind, Texture>>;

const BASE_COLORS: Readonly<Record<TextureKind, readonly [number, number, number]>> = Object.freeze({
  plaster: [224, 211, 173],
  soil: [93, 74, 50],
  wood: [91, 55, 34],
  roof: [78, 94, 57],
  paper: [242, 217, 166],
});

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

function textureVariation(kind: TextureKind, x: number, y: number, seed: number): number {
  const broad = valueNoise2D(x / 34, y / 34, seed) * 18;
  const grain = (randomAt(seed ^ 0x8e51, x + y * PROCEDURAL_TEXTURE_SIZE) - 0.5) * 16;
  switch (kind) {
    case 'plaster':
      return broad + grain * 0.7 + (Math.sin(x * 0.17 + y * 0.09) * 3);
    case 'soil':
      return broad * 0.7 + grain * 1.4 + (randomAt(seed ^ 0x711a, x * 3 + y * 701) > 0.93 ? 26 : 0);
    case 'wood': {
      const ring = Math.sin(Math.hypot(x - 96, y - 131) * 0.19 + valueNoise2D(x / 21, y / 21, seed) * 2.4);
      return ring * 16 + broad * 0.45 + grain * 0.3;
    }
    case 'roof':
      return broad * 0.8 + grain + (Math.sin((x + y) * 0.42) > 0.82 ? 13 : 0);
    case 'paper':
      return broad * 0.38 + grain * 0.22 + Math.sin(y * 0.11) * 1.8;
  }
}

export function createTexturePixels(kind: TextureKind, seed = 111): Uint8Array {
  const pixels = new Uint8Array(PROCEDURAL_TEXTURE_SIZE * PROCEDURAL_TEXTURE_SIZE * 4);
  const base = BASE_COLORS[kind];
  const channelBias: readonly [number, number, number] = kind === 'soil'
    ? [1, 0.78, 0.55]
    : kind === 'roof'
      ? [0.75, 1, 0.68]
      : [1, 0.94, 0.82];

  for (let y = 0; y < PROCEDURAL_TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < PROCEDURAL_TEXTURE_SIZE; x += 1) {
      const offset = (x + y * PROCEDURAL_TEXTURE_SIZE) * 4;
      const variation = textureVariation(kind, x, y, seed ^ (TEXTURE_KINDS.indexOf(kind) + 1) * 0x1f31);
      pixels[offset] = clampByte(base[0] + variation * channelBias[0]);
      pixels[offset + 1] = clampByte(base[1] + variation * channelBias[1]);
      pixels[offset + 2] = clampByte(base[2] + variation * channelBias[2]);
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

function textureFromPixels(kind: TextureKind, pixels: Uint8Array): Texture {
  let texture: Texture;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = PROCEDURAL_TEXTURE_SIZE;
    canvas.height = PROCEDURAL_TEXTURE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is required for procedural world textures');
    const image = context.createImageData(PROCEDURAL_TEXTURE_SIZE, PROCEDURAL_TEXTURE_SIZE);
    image.data.set(pixels);
    context.putImageData(image, 0, 0);
    texture = new CanvasTexture(canvas);
  } else {
    texture = new DataTexture(
      pixels,
      PROCEDURAL_TEXTURE_SIZE,
      PROCEDURAL_TEXTURE_SIZE,
      RGBAFormat,
      UnsignedByteType,
    );
    texture.needsUpdate = true;
  }

  texture.name = `texture:${kind}`;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.repeat.set(kind === 'paper' ? 1 : 4, kind === 'paper' ? 1 : 4);
  return texture;
}

export function createProceduralTextures(seed = 111): ProceduralTextureSet {
  return Object.freeze(Object.fromEntries(
    TEXTURE_KINDS.map((kind, index) => [kind, textureFromPixels(kind, createTexturePixels(kind, seed + index * 101))]),
  ) as Record<TextureKind, Texture>);
}
