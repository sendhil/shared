import * as THREE from 'three';

export const PALETTE = {
  inkNight: '#081a20',
  hillMoss: '#1f4938',
  lanternGold: '#c9a85c',
  hearthGlow: '#efc98f',
  clayRoof: '#8a5d4d',
  fogSilver: '#b7cbd2',
  meadow: '#6f9a56',
  darkMeadow: '#2c5a42',
  plaster: '#d7c6a2',
  timber: '#5b382c',
};

export const seeded = (seed: number): (() => number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const variedColor = (base: THREE.ColorRepresentation, amount: number, random: () => number): THREE.Color => {
  const color = new THREE.Color(base);
  color.offsetHSL((random() - 0.5) * amount * 0.32, (random() - 0.5) * amount, (random() - 0.5) * amount);
  return color;
};

export function canvasGrain(seed: number, colors: readonly string[]): THREE.CanvasTexture {
  const random = seeded(seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas texture creation is unavailable.');

  context.fillStyle = colors[0];
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 1400; index += 1) {
    context.globalAlpha = 0.08 + random() * 0.18;
    context.fillStyle = colors[Math.floor(random() * colors.length)];
    const size = 0.4 + random() * 2.5;
    context.fillRect(random() * 128, random() * 128, size, size);
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  texture.anisotropy = 4;
  return texture;
}

export function stylizedMaterial(
  color: THREE.ColorRepresentation,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0,
    flatShading: true,
    ...options,
  });
}

export const shadow = <T extends THREE.Object3D>(object: T): T => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
};
