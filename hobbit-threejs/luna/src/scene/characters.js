import * as THREE from 'three';

function makeLimb(length, radius, material) {
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, length, 8), material);
  limb.castShadow = true;
  return limb;
}

function createHumanoid({ name, position, scale = 1, coat, vest, skin, hair, shoes, facing = 0, role = 'villager' }) {
  const root = new THREE.Group();
  root.name = name;
  root.position.copy(position);
  root.rotation.y = facing;
  root.scale.setScalar(scale);

  const materials = {
    coat: new THREE.MeshStandardMaterial({ color: coat, roughness: 0.84 }),
    vest: new THREE.MeshStandardMaterial({ color: vest, roughness: 0.76 }),
    skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.78 }),
    hair: new THREE.MeshStandardMaterial({ color: hair, roughness: 0.96 }),
    shoes: new THREE.MeshStandardMaterial({ color: shoes, roughness: 0.9 }),
    eyes: new THREE.MeshStandardMaterial({ color: 0x171817, roughness: 0.55 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc99649, roughness: 0.32, metalness: 0.72 }),
  };

  const parts = {};
  parts.pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.28, 10), materials.coat);
  parts.pelvis.position.y = 0.42;
  root.add(parts.pelvis);
  parts.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.68, 10), materials.coat);
  parts.torso.position.y = 0.83;
  parts.torso.scale.z = 0.72;
  parts.torso.castShadow = true;
  root.add(parts.torso);
  const vestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.46, 0.04), materials.vest);
  vestPanel.position.set(0, 0.84, 0.245);
  vestPanel.castShadow = true;
  root.add(vestPanel);
  parts.head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), materials.skin);
  parts.head.position.y = 1.42;
  parts.head.scale.set(1, 1.08, 0.9);
  parts.head.castShadow = true;
  root.add(parts.head);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.17, 7), materials.skin);
  nose.position.set(0, 1.39, 0.285);
  nose.rotation.x = Math.PI / 2;
  root.add(nose);
  parts.eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), materials.eyes);
  parts.eyeL.position.set(-0.105, 1.49, 0.267);
  root.add(parts.eyeL);
  parts.eyeR = parts.eyeL.clone();
  parts.eyeR.position.x = 0.105;
  root.add(parts.eyeR);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), materials.eyes);
  mouth.position.set(0, 1.28, 0.274);
  root.add(mouth);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.31, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.46), materials.hair);
  hairCap.position.set(0, 1.56, -0.015);
  hairCap.scale.set(1.03, 0.78, 0.98);
  hairCap.castShadow = true;
  root.add(hairCap);
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), materials.skin);
  earL.position.set(-0.29, 1.45, 0);
  root.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.29;
  root.add(earR);

  parts.armL = makeLimb(0.7, 0.105, materials.coat);
  parts.armL.position.set(-0.39, 0.9, 0);
  parts.armL.rotation.z = -0.18;
  root.add(parts.armL);
  parts.armR = makeLimb(0.7, 0.105, materials.coat);
  parts.armR.position.set(0.39, 0.9, 0);
  parts.armR.rotation.z = 0.18;
  root.add(parts.armR);
  parts.handL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 7), materials.skin);
  parts.handL.position.set(-0.46, 0.55, 0);
  root.add(parts.handL);
  parts.handR = parts.handL.clone();
  parts.handR.position.x = 0.46;
  root.add(parts.handR);

  parts.legL = makeLimb(0.76, 0.13, materials.coat);
  parts.legL.position.set(-0.15, 0.1, 0);
  root.add(parts.legL);
  parts.legR = makeLimb(0.76, 0.13, materials.coat);
  parts.legR.position.set(0.15, 0.1, 0);
  root.add(parts.legR);
  parts.shoeL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 7), materials.shoes);
  parts.shoeL.scale.set(1.1, 0.55, 1.55);
  parts.shoeL.position.set(-0.17, -0.23, 0.09);
  root.add(parts.shoeL);
  parts.shoeR = parts.shoeL.clone();
  parts.shoeR.position.x = 0.17;
  root.add(parts.shoeR);

  if (role === 'bilbo') {
    const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.045, 16), materials.brass);
    watch.rotation.x = Math.PI / 2;
    watch.position.set(0.48, 0.55, 0.11);
    root.add(watch);
    const bell = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.23, 7), materials.brass);
    handle.position.y = 0.16;
    const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.17, 12), materials.brass);
    bellBody.position.y = 0.02;
    bell.add(handle, bellBody);
    bell.position.set(0.48, 0.46, 0.16);
    bell.rotation.z = -0.28;
    root.add(bell);
    parts.bell = bell;
  }

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = child.castShadow ?? true;
      child.receiveShadow = true;
    }
  });
  root.userData = { name, parts, role, baseY: position.y, baseScale: scale, seed: name.length * 17 };
  return root;
}

export function setPose(character, pose, amount = 1, time = 0) {
  const { parts } = character.userData;
  const wave = Math.sin(time * 4 + character.userData.seed) * 0.06;
  const idle = Math.sin(time * 1.5 + character.userData.seed) * 0.018;
  parts.armL.rotation.x = 0;
  parts.armR.rotation.x = 0;
  parts.armL.rotation.z = -0.18;
  parts.armR.rotation.z = 0.18;
  parts.legL.rotation.set(0, 0, 0);
  parts.legR.rotation.set(0, 0, 0);
  parts.torso.rotation.set(0, 0, 0);
  parts.handL.position.y = 0.55;
  parts.handR.position.y = 0.55;
  parts.head.rotation.set(0, idle, 0);
  character.position.y = character.userData.baseY + Math.abs(Math.sin(time * 2.2 + character.userData.seed)) * 0.015;
  if (pose === 'turn') {
    parts.head.rotation.y = 0.7 * amount + idle;
    parts.torso.rotation.y = 0.14 * amount;
  } else if (pose === 'wave') {
    parts.armR.rotation.z = -1.1 * amount;
    parts.armR.rotation.x = 0.25 * amount + wave;
    parts.handR.position.y = 0.82 * amount + 0.45;
    parts.head.rotation.y = -0.28 * amount + idle;
  } else if (pose === 'announce') {
    parts.armR.rotation.z = -1.05 * amount;
    parts.armR.rotation.x = 0.45 * amount;
    parts.armL.rotation.z = 0.5 * amount;
    parts.armL.rotation.x = -0.1 * amount;
    parts.head.rotation.y = -0.12 * amount;
    if (parts.bell) parts.bell.rotation.z = -0.28 + Math.sin(time * 8) * 0.08 * amount;
  } else if (pose === 'whisper') {
    parts.armL.rotation.z = 0.66 * amount;
    parts.armL.rotation.x = -0.25 * amount;
    parts.armR.rotation.z = -0.42 * amount;
    parts.head.rotation.y = 0.42 * amount;
  } else if (pose === 'point') {
    parts.armR.rotation.z = -0.85 * amount;
    parts.armR.rotation.x = 0.65 * amount;
    parts.head.rotation.y = 0.5 * amount;
  } else if (pose === 'walk') {
    const stride = Math.sin(time * 6 + character.userData.seed) * 0.42 * amount;
    parts.legL.rotation.x = stride;
    parts.legR.rotation.x = -stride;
    parts.armL.rotation.x = -stride * 0.6;
    parts.armR.rotation.x = stride * 0.6;
    character.position.y = character.userData.baseY + Math.abs(Math.sin(time * 6 + character.userData.seed)) * 0.035 * amount;
  } else if (pose === 'wary-watch') {
    parts.head.rotation.y = 0.8 * amount;
    parts.torso.rotation.z = -0.08 * amount;
    parts.armL.rotation.z = 0.35 * amount;
    parts.armR.rotation.z = -0.35 * amount;
  }
}

export function createCharacters({ terrain, village }) {
  const group = new THREE.Group();
  group.name = 'community-characters';
  const baseY = village.bagEnd.position.y + 0.06;
  const bilbo = createHumanoid({
    name: 'Bilbo Baggins',
    position: new THREE.Vector3(village.bagEnd.position.x, baseY, village.bagEnd.position.z + 3.3),
    scale: 1.02,
    coat: 0x394942,
    vest: 0xb77948,
    skin: 0xd59a70,
    hair: 0x6c5943,
    shoes: 0x3d3029,
    facing: Math.PI,
    role: 'bilbo',
  });
  group.add(bilbo);

  const palettes = [
    [0x6a4d48, 0xb9a463, 0xc18c6f, 0x3a302d, 0x292b29], [0x3f5d5c, 0xb36a4d, 0xb88365, 0x624b3f, 0x2d2c2a],
    [0x7b6046, 0xc58f54, 0xd3a37e, 0x796246, 0x35312b], [0x566449, 0xa77662, 0xbd8465, 0x51443d, 0x302d28],
    [0x5f4e6b, 0xb98d67, 0xd69e79, 0x4c3a35, 0x2e2b2c], [0x48536a, 0xb7a15d, 0xc89375, 0x5b4741, 0x282b2d],
    [0x7c5140, 0x8f9c63, 0xc38d6b, 0x4a372e, 0x252827], [0x4f6250, 0xc38b66, 0xd49a74, 0x635044, 0x302c2b],
    [0x6a5961, 0xb4a46d, 0xc18c71, 0x59443f, 0x2b292b], [0x4b5a46, 0xb66a54, 0xc58c70, 0x554539, 0x292728],
  ];
  const placements = [
    [-8, 4, 1.02, 0.2, 'square'], [-14, 6, 0.95, -0.7, 'carrier'], [-4, 1, 1.08, 0.8, 'carrier'],
    [2, 1, 0.92, -0.2, 'carrier'], [10, 3, 1.05, 1.2, 'garden'], [17, 4, 0.94, -1.3, 'garden'],
    [-13, -2, 1.12, 0.1, 'shop'], [-18, 4, 0.9, -0.4, 'shop'], [2, 13, 0.98, 0.7, 'lane'], [20, -10, 1.1, 2.4, 'lane'],
    [-23, -4, 0.94, -1.9, 'lane'], [26, 0, 1.06, 1.8, 'lane'],
  ];
  const villagers = placements.map(([x, z, scale, facing, role], index) => {
    const palette = palettes[index % palettes.length];
    const villager = createHumanoid({
      name: `villager-${index + 1}`,
      position: new THREE.Vector3(x, terrain.getHeightAt(x, z) + 0.05, z),
      scale,
      coat: palette[0], vest: palette[1], skin: palette[2], hair: palette[3], shoes: palette[4], facing, role,
    });
    villager.userData.homePosition = villager.position.clone();
    villager.userData.index = index;
    group.add(villager);
    return villager;
  });

  return {
    group,
    bilbo,
    villagers,
    update(state) {
      const { time, newsLevel = 0, rumorLevel = 0, mood } = state;
      const announcing = mood === 'bright' && time > 27 && time < 43;
      setPose(bilbo, announcing ? 'announce' : rumorLevel > 0.55 ? 'wary-watch' : 'idle', announcing ? 1 : rumorLevel * 0.35, time);
      villagers.forEach((villager, index) => {
        const stagger = (index % 4) * 0.13;
        let pose = 'idle';
        let amount = 0.3;
        if (newsLevel > 0.25 && (index % 3 === 0 || villager.userData.role === 'carrier')) pose = 'turn';
        if (newsLevel > 0.55 && index % 4 === 1) pose = 'wave';
        if (newsLevel > 0.72 && villager.userData.role === 'carrier') pose = 'walk';
        if (rumorLevel > 0.58 && index % 2 === 0) pose = 'wary-watch';
        if (mood === 'memory' && index % 3 === 0) pose = 'point';
        setPose(villager, pose, amount + newsLevel * 0.42 + rumorLevel * 0.24, time + stagger);
        const home = villager.userData.homePosition;
        if (pose === 'walk') {
          const travel = Math.sin(time * 0.16 + index) * 0.55 * newsLevel;
          villager.position.x = home.x + travel;
          villager.position.z = home.z + Math.cos(time * 0.12 + index) * 0.22 * newsLevel;
          villager.position.y = terrain.getHeightAt(villager.position.x, villager.position.z) + 0.05;
        } else {
          villager.position.x = home.x;
          villager.position.z = home.z;
          villager.position.y = home.y + Math.sin(time * 1.2 + index) * 0.004;
        }
        if (rumorLevel > 0.55 && index % 2 === 0) {
          villager.rotation.y = Math.atan2(village.bagEnd.position.x - villager.position.x, village.bagEnd.position.z - villager.position.z);
        }
      });
    },
  };
}
