import * as THREE from 'three';

const easeInOut = (value) => value * value * (3 - 2 * value);

const defaultTargets = {
  place: { from: [-31, 13, 25], to: [-15, 8, 16], lookFrom: [0, 1.2, 1], lookTo: [3, 1.4, -4] },
  home: { from: [-7, 7, 13], to: [1, 4.6, 8], lookFrom: [7, 1.2, -9], lookTo: [8, 1.8, -6] },
  announcement: { from: [0, 3.8, 5], to: [-1, 3.2, 1.8], lookFrom: [8, 1.6, -5.4], lookTo: [8, 1.2, -6.2] },
  propagation: { from: [-16, 3.5, 10], to: [-3, 4.1, 11], lookFrom: [-8, 1.3, 4], lookTo: [-3, 1.4, 3] },
  history: { from: [-5, 5.2, 4], to: [1, 4.8, 1], lookFrom: [0, 3.4, -5], lookTo: [1.5, 3.9, -5.7] },
  rumor: { from: [7, 2.8, 3], to: [11, 2.2, 0.5], lookFrom: [8, 0.9, -9], lookTo: [8, 0.2, -10] },
  unchanged: { from: [0, 5.2, 10], to: [3.5, 4.6, 8], lookFrom: [8, 1.2, -9], lookTo: [8, 1.8, -9] },
  unease: { from: [-2, 4.8, 13], to: [3, 4.2, 10], lookFrom: [8, 1.5, -9], lookTo: [8, 1.3, -8] },
};

function makeFrame(data) {
  return {
    from: new THREE.Vector3(...data.from),
    to: new THREE.Vector3(...data.to),
    lookFrom: new THREE.Vector3(...data.lookFrom),
    lookTo: new THREE.Vector3(...data.lookTo),
  };
}

export function createCinematicCamera({ camera, targets = defaultTargets } = {}) {
  const frames = Object.fromEntries(Object.entries(targets).map(([key, value]) => [key, makeFrame(value)]));
  let orbitEnabled = false;
  let orbitAngle = 0.3;
  const orbitCenter = new THREE.Vector3(8, 1.2, -9);
  const nextPosition = new THREE.Vector3();
  const nextLook = new THREE.Vector3();

  return {
    update(state) {
      if (orbitEnabled) {
        orbitAngle += 0.0018;
        const radius = 14.5;
        camera.position.set(orbitCenter.x + Math.cos(orbitAngle) * radius, orbitCenter.y + 6.6 + Math.sin(orbitAngle * 0.7) * 1.4, orbitCenter.z + Math.sin(orbitAngle) * radius);
        camera.lookAt(orbitCenter);
        return;
      }
      const frame = frames[state.beat?.id] ?? frames.place;
      const eased = easeInOut(state.beatProgress ?? 0);
      nextPosition.lerpVectors(frame.from, frame.to, eased);
      nextLook.lerpVectors(frame.lookFrom, frame.lookTo, eased);
      camera.position.lerp(nextPosition, 0.15);
      camera.lookAt(nextLook);
    },
    setOrbit(enabled) {
      orbitEnabled = Boolean(enabled);
      if (!orbitEnabled) this.reset();
    },
    reset() {
      orbitEnabled = false;
      orbitAngle = 0.3;
      camera.position.set(-31, 13, 25);
      camera.lookAt(0, 1.2, 1);
    },
  };
}
