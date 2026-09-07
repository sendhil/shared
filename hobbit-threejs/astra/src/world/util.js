import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function random(seed = 111) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const rng = random();
export const between = (a, b) => a + (b - a) * rng();
export const pick = values => values[Math.floor(rng() * values.length)];
export const palette = {
  grass: '#698947', grassLight: '#9cab55', grassDark: '#345b42',
  stone: '#bdab89', stoneDark: '#887e68', timber: '#624537',
  cream: '#e4c9a0', roof: '#967248', teal: '#2f6c71',
  plum: '#765366', copper: '#b8764e', gold: '#ecc579',
};
export const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...opts });
const ballGeo = new THREE.SphereGeometry(1, 16, 12);
const cubeGeo = new RoundedBoxGeometry(1,1,1,2,.045);
export function mesh(geo, material, parent, position = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...position); m.scale.set(...scale);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
export const ball = (parent, material, position, scale) => mesh(ballGeo, material, parent, position, scale);
export const box = (parent, material, position, scale) => mesh(cubeGeo, material, parent, position, scale);
export function rod(parent, material, from, to, radius, radiusTop = radius) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const m = mesh(new THREE.CylinderGeometry(radiusTop, radius, a.distanceTo(b), 8), material, parent);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return m;
}
export function curveTube(parent, points, radius, material, segments = 24) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 6, false), material, parent);
}
export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export function textTexture(text, opts = {}) {
  return canvasTexture(1024, 512, (ctx,w,h) => {
    ctx.fillStyle = opts.background || '#e4c9a0'; ctx.fillRect(0,0,w,h);
    const rand = random(9);
    for (let i=0;i<3500;i++) {
      ctx.fillStyle = 'rgba(92,64,31,.035)'; ctx.fillRect(rand()*w,rand()*h,rand()*12,1);
    }
    ctx.strokeStyle = opts.color || '#66482d'; ctx.lineWidth=5;
    ctx.strokeRect(28,28,w-56,h-56); ctx.lineWidth=1;ctx.strokeRect(40,40,w-80,h-80);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=opts.color || '#66482d';
    ctx.font=opts.font || 'italic 230px Georgia';
    ctx.fillText(text,w/2,h/2+9);
  });
}

export function noiseTexture(base = '#8a764f') {
  return canvasTexture(128, 128, (ctx,w,h) => {
    ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
    const rand=random(29);
    for(let i=0;i<2800;i++){
      ctx.fillStyle=rand()>.5?'rgba(255,247,209,.075)':'rgba(25,34,25,.055)';
      ctx.fillRect(rand()*w,rand()*h,rand()*6+1,rand()*2+1);
    }
  });
}
