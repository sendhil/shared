import * as THREE from 'three';
import { mulberry32 } from './terrain.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));

export function getEffectLevels({ mood = 'dawn', beatProgress = 0, newsLevel = 0, rumorLevel = 0 } = {}) {
  const progress = clamp01(beatProgress);
  const memory = mood === 'memory' ? Math.sin(progress * Math.PI) : 0;
  const timeFocus = mood === 'unchanged' ? progress : mood === 'twilight' ? 0.65 + progress * 0.35 : 0;
  let rumor = clamp01(rumorLevel);
  if (mood === 'unchanged') rumor *= (1 - progress) * 0.8;
  if (mood === 'twilight') rumor *= 0.28;
  if (mood === 'unease') rumor *= 0.42;
  return { news: clamp01(newsLevel), rumor: clamp01(rumor), memory, timeFocus };
}

function makeLine(points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 9;
  return line;
}

function makeMemoryPanel(position, index, materials) {
  const panel = new THREE.Group();
  panel.position.copy(position);
  panel.rotation.y = -0.34 + index * 0.18;
  const background = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshBasicMaterial({ color: index % 2 ? 0x344c4c : 0x4b5b49, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  background.renderOrder = 7;
  panel.add(background);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.2, 2.2)), new THREE.LineBasicMaterial({ color: 0xd2aa70, transparent: true, opacity: 0, depthWrite: false }));
  frame.position.z = 0.02;
  frame.renderOrder = 8;
  panel.add(frame);
  const iconMaterial = new THREE.MeshBasicMaterial({ color: index % 2 ? 0xd2aa70 : 0xa5c2a3, transparent: true, opacity: 0, depthWrite: false });
  if (index === 0) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 1.35), iconMaterial);
    road.rotation.z = 0.35;
    road.position.set(-0.25, -0.05, 0.04);
    panel.add(road);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), iconMaterial);
    moon.position.set(0.65, 0.57, 0.04);
    panel.add(moon);
  } else if (index === 1) {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.18), iconMaterial);
    trunk.position.set(0, -0.2, 0.04);
    panel.add(trunk);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.12), iconMaterial);
    handle.rotation.z = -0.56;
    handle.position.set(0.1, 0.25, 0.04);
    panel.add(handle);
  } else {
    for (let i = 0; i < 4; i += 1) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), iconMaterial);
      coin.rotation.x = Math.PI / 2;
      coin.position.set(-0.58 + (i % 2) * 0.72, -0.16 + Math.floor(i / 2) * 0.47, 0.04);
      panel.add(coin);
    }
  }
  panel.userData = { background, frame, iconMaterial };
  return panel;
}

function makeTunnel(materials) {
  const tunnelGroup = new THREE.Group();
  tunnelGroup.name = 'imagined-tunnels';
  tunnelGroup.position.set(8, 0.35, -10);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x74c9c0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const curves = [
    [new THREE.Vector3(-3, -0.3, 0), new THREE.Vector3(-1.6, 0.2, 0.3), new THREE.Vector3(0, -0.1, -0.2), new THREE.Vector3(1.8, 0.35, 0.1), new THREE.Vector3(3.2, -0.05, 0.6)],
    [new THREE.Vector3(-1.2, -0.4, 0.2), new THREE.Vector3(-0.9, -0.85, 0.5), new THREE.Vector3(0.1, -1.1, 0.7), new THREE.Vector3(1.4, -0.82, 0.2)],
    [new THREE.Vector3(-0.5, 0.15, -0.2), new THREE.Vector3(-0.2, 0.75, -0.55), new THREE.Vector3(0.8, 0.92, -0.24), new THREE.Vector3(1.6, 0.5, -0.4)],
  ];
  curves.forEach((points, index) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.045 + index * 0.018, 6, false), glowMaterial);
    tube.renderOrder = 12;
    tunnelGroup.add(tube);
  });
  for (let i = 0; i < 14; i += 1) {
    const treasure = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11 + (i % 3) * 0.035, 0), materials.gold.clone());
    treasure.material.transparent = true;
    treasure.material.opacity = 0;
    treasure.material.emissive = new THREE.Color(0x7c542b);
    treasure.material.emissiveIntensity = 1.4;
    treasure.position.set(-2.3 + (i % 5) * 1.08, -0.45 + Math.floor(i / 5) * 0.48, -0.15 + (i % 2) * 0.25);
    treasure.rotation.set(i * 0.4, i * 0.8, i * 0.3);
    treasure.renderOrder = 13;
    tunnelGroup.add(treasure);
  }
  tunnelGroup.userData.glowMaterial = glowMaterial;
  tunnelGroup.userData.renderables = tunnelGroup.children.slice();
  tunnelGroup.traverse((child) => { child.material?.depthTest && (child.material.depthTest = false); });
  return tunnelGroup;
}

export function createEffects({ village, characters, materials }) {
  const group = new THREE.Group();
  group.name = 'story-effects';
  const random = mulberry32(912);

  const newsGroup = new THREE.Group();
  newsGroup.name = 'news-ribbons';
  const newsPairs = [
    [new THREE.Vector3(-14, 1.2, 6), new THREE.Vector3(-8, 1.5, 4)],
    [new THREE.Vector3(-8, 1.5, 4), new THREE.Vector3(-2, 1.1, 1)],
    [new THREE.Vector3(-2, 1.1, 1), new THREE.Vector3(5, 1.6, 2)],
    [new THREE.Vector3(5, 1.6, 2), new THREE.Vector3(12, 1.2, 3)],
    [new THREE.Vector3(12, 1.2, 3), village.anchors.announcement.clone()],
  ];
  const ribbons = newsPairs.map(([from, to], index) => {
    const middle = from.clone().lerp(to, 0.5);
    middle.y += 0.4 + (index % 2) * 0.16;
    const line = makeLine([from, middle, to], 0xe2b56c, 0);
    newsGroup.add(line);
    return line;
  });
  const newsMotes = [];
  for (let i = 0; i < 28; i += 1) {
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.055 + random() * 0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0xf0c678, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    mote.userData = { seed: random(), phase: random() };
    newsGroup.add(mote);
    newsMotes.push(mote);
  }
  group.add(newsGroup);

  const memoryGroup = new THREE.Group();
  memoryGroup.name = 'memory-tableaux';
  const memories = [
    makeMemoryPanel(new THREE.Vector3(-2.4, 4.4, -4.4), 0, materials),
    makeMemoryPanel(new THREE.Vector3(0.9, 4.05, -4.7), 1, materials),
    makeMemoryPanel(new THREE.Vector3(4.1, 3.8, -4.25), 2, materials),
  ];
  memories.forEach((panel) => panel.scale.setScalar(0.78));
  memories.forEach((panel) => memoryGroup.add(panel));
  group.add(memoryGroup);

  const tunnelGroup = makeTunnel(materials);
  group.add(tunnelGroup);

  const particleCount = 160;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    particlePositions[i * 3] = -35 + random() * 70;
    particlePositions[i * 3 + 1] = 0.2 + random() * 8;
    particlePositions[i * 3 + 2] = -25 + random() * 42;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({ color: 0xf1cd8b, size: 0.075, transparent: true, opacity: 0.04, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.name = 'airborne-particles';
  group.add(particles);

  const bellPulse = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 32), new THREE.MeshBasicMaterial({ color: 0xf0c476, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  bellPulse.position.copy(village.anchors.announcement);
  bellPulse.position.y += 0.25;
  bellPulse.rotation.x = -Math.PI / 2;
  group.add(bellPulse);

  const timeRingGroup = new THREE.Group();
  timeRingGroup.name = 'time-contrast-rings';
  timeRingGroup.position.set(village.anchors.bagEnd.x, village.anchors.bagEnd.y + 1.55, village.anchors.bagEnd.z + 2.55);
  const timeRings = [];
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55 + i * 0.48, 0.028, 8, 48), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xd2aa70 : 0x8eb7aa, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.position.z = i * 0.08;
    ring.renderOrder = 11;
    timeRingGroup.add(ring);
    timeRings.push(ring);
  }
  group.add(timeRingGroup);

  return {
    group,
    update(state) {
      const levels = getEffectLevels(state);
      const news = levels.news;
      const rumor = levels.rumor;
      const memory = levels.memory;
      ribbons.forEach((line, index) => {
        line.material.opacity = Math.max(0, (news - index * 0.12) * 0.62) + Math.sin(state.time * 2.6 + index) * 0.04 * news;
      });
      newsMotes.forEach((mote, index) => {
        const pairIndex = index % newsPairs.length;
        const [from, to] = newsPairs[pairIndex];
        const progress = (state.time * 0.12 + mote.userData.phase + index * 0.023) % 1;
        mote.position.copy(from).lerp(to, progress);
        mote.position.y += Math.sin(progress * Math.PI) * 0.45 + Math.sin(state.time * 1.8 + index) * 0.04;
        mote.material.opacity = news * (0.12 + Math.sin(progress * Math.PI) * 0.52);
      });
      memories.forEach((panel, index) => {
        const opacity = Math.max(0, memory * (0.7 - index * 0.12));
        panel.userData.background.material.opacity = opacity * 0.62;
        panel.userData.frame.material.opacity = opacity;
        panel.userData.iconMaterial.opacity = opacity;
        panel.position.y = [4.4, 4.05, 3.8][index] + Math.sin(state.time * 0.8 + index) * 0.08;
        panel.rotation.z = Math.sin(state.time * 0.4 + index) * 0.025;
      });
      tunnelGroup.rotation.y = Math.sin(state.time * 0.18) * 0.08;
      tunnelGroup.userData.glowMaterial.opacity = rumor * 0.7;
      tunnelGroup.userData.renderables.forEach((renderable, index) => {
        if (renderable.material && renderable !== tunnelGroup.userData.glowMaterial) {
          if (renderable.material.opacity !== undefined) renderable.material.opacity = rumor * (0.28 + (index % 4) * 0.07);
        }
      });
      particleMaterial.opacity = 0.035 + state.timeContrast * 0.08 + Math.max(0, news - 0.45) * 0.04;
      particles.rotation.y = state.time * 0.004;
      bellPulse.material.opacity = state.beat?.id === 'announcement' ? Math.max(0, Math.sin((state.time - 26) * 3.7)) * 0.45 : 0;
      const pulseScale = 1 + Math.max(0, Math.sin((state.time - 26) * 3.7)) * 1.4;
      bellPulse.scale.setScalar(pulseScale);
      timeRings.forEach((ring, index) => {
        ring.material.opacity = levels.timeFocus * (0.16 + index * 0.04);
        ring.rotation.z = state.time * (0.05 + index * 0.018) * (index % 2 ? -1 : 1);
        ring.scale.setScalar(1 + levels.timeFocus * (0.07 + index * 0.05));
      });
    },
    setPhase(phase) {
      group.userData.phase = phase;
    },
  };
}
