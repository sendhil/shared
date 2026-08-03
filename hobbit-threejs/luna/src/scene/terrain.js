import * as THREE from 'three';

export function mulberry32(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTexture(base, accent, mode = 'grain', seed = 1) {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const random = mulberry32(seed);
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);
  context.globalAlpha = mode === 'plaster' ? 0.14 : 0.23;
  for (let i = 0; i < 260; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const length = mode === 'grain' ? 3 + random() * 12 : 1 + random() * 5;
    context.strokeStyle = accent;
    context.lineWidth = mode === 'grain' ? 0.7 + random() * 1.2 : 1;
    context.beginPath();
    if (mode === 'grain') {
      context.moveTo(x, y);
      context.lineTo(x + length, y + (random() - 0.5) * 2);
    } else {
      context.arc(x, y, length, 0, Math.PI * 2);
    }
    context.stroke();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  return texture;
}

export function createMaterials(seed = 712) {
  return {
    grass: new THREE.MeshStandardMaterial({ color: 0x496349, roughness: 1, metalness: 0 }),
    grassDark: new THREE.MeshStandardMaterial({ color: 0x314b3a, roughness: 1 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x6c503a, roughness: 1, map: makeTexture('#6c503a', '#9b7550', 'grain', seed + 1) }),
    path: new THREE.MeshStandardMaterial({ color: 0x9a7757, roughness: 1, map: makeTexture('#9a7757', '#c19b70', 'grain', seed + 2) }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xb6a184, roughness: 0.92, map: makeTexture('#b6a184', '#ede2c7', 'plaster', seed + 3) }),
    plasterLight: new THREE.MeshStandardMaterial({ color: 0xd3c3a2, roughness: 0.88, map: makeTexture('#d3c3a2', '#fff3d1', 'plaster', seed + 4) }),
    timber: new THREE.MeshStandardMaterial({ color: 0x3f3025, roughness: 0.96, map: makeTexture('#3f3025', '#816044', 'grain', seed + 5) }),
    roof: new THREE.MeshStandardMaterial({ color: 0x5a3d32, roughness: 0.9, map: makeTexture('#5a3d32', '#94634a', 'grain', seed + 6) }),
    stone: new THREE.MeshStandardMaterial({ color: 0x77746a, roughness: 1, map: makeTexture('#77746a', '#a9a394', 'plaster', seed + 7) }),
    stoneLight: new THREE.MeshStandardMaterial({ color: 0xa6a08f, roughness: 1, map: makeTexture('#a6a08f', '#d6cdb7', 'plaster', seed + 8) }),
    copper: new THREE.MeshStandardMaterial({ color: 0x9d6b45, roughness: 0.36, metalness: 0.7 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fc7bf, roughness: 0.12, metalness: 0.04, transmission: 0.18, transparent: true, opacity: 0.7 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x385b40, roughness: 1 }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x54724a, roughness: 1 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x314d38, roughness: 1 }),
    flower: new THREE.MeshStandardMaterial({ color: 0xc68172, roughness: 0.8 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xcda05a, roughness: 0.3, metalness: 0.75 }),
    window: new THREE.MeshStandardMaterial({ color: 0xf4c875, emissive: 0xc47738, emissiveIntensity: 1.65, roughness: 0.45 }),
    coolGlow: new THREE.MeshBasicMaterial({ color: 0x64b6b0, transparent: true, opacity: 0.75, depthWrite: false }),
  };
}

export function terrainHeight(x, z) {
  const hill = Math.exp(-(((x - 8) ** 2) / 92 + ((z + 9) ** 2) / 80));
  const ridge = Math.exp(-(((x + 19) ** 2) / 220 + ((z - 8) ** 2) / 170)) * 0.65;
  const farSlope = Math.sin((x + z * 0.45) * 0.055) * 0.18;
  return -0.78 + hill * 1.82 + ridge * 0.8 + farSlope;
}

function addRibbon(group, points, width, material, heightFn, offset = 0.035) {
  const positions = [];
  const indices = [];
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const direction = new THREE.Vector2(next[0] - previous[0], next[1] - previous[1]).normalize();
    const normal = new THREE.Vector2(-direction.y, direction.x).multiplyScalar(width * 0.5);
    const leftX = point[0] + normal.x;
    const leftZ = point[1] + normal.y;
    const rightX = point[0] - normal.x;
    const rightZ = point[1] - normal.y;
    positions.push(leftX, heightFn(leftX, leftZ) + offset, leftZ, rightX, heightFn(rightX, rightZ) + offset, rightZ);
    if (i < points.length - 1) {
      const current = i * 2;
      indices.push(current, current + 1, current + 2, current + 1, current + 3, current + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ribbon = new THREE.Mesh(geometry, material);
  ribbon.receiveShadow = true;
  group.add(ribbon);
  return ribbon;
}

function addHedge(group, a, b, material, heightFn, scale = 1) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const hedge = new THREE.Mesh(new THREE.BoxGeometry(length, 0.88 * scale, 0.64 * scale), material);
  hedge.position.set((a[0] + b[0]) * 0.5, heightFn((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5) + 0.44 * scale, (a[1] + b[1]) * 0.5);
  hedge.rotation.y = Math.atan2(dz, dx);
  hedge.castShadow = true;
  hedge.receiveShadow = true;
  group.add(hedge);
  return hedge;
}

function addTree(group, x, z, heightFn, materials, size = 1, seed = 1, foliage = []) {
  const random = mulberry32(seed);
  const tree = new THREE.Group();
  tree.position.set(x, heightFn(x, z), z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * size, 0.26 * size, 1.85 * size, 8), materials.timber);
  trunk.position.y = 0.92 * size;
  trunk.castShadow = true;
  tree.add(trunk);
  const crownMaterial = random() > 0.45 ? materials.leaf : materials.leafLight;
  const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 * size, 1), crownMaterial);
  crown.position.set(0, 2.15 * size, 0);
  crown.scale.set(1.1, 0.88, 1.03);
  crown.castShadow = true;
  tree.add(crown);
  const crownTwo = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82 * size, 1), materials.leafLight);
  crownTwo.position.set(-0.45 * size, 2.7 * size, 0.15 * size);
  crownTwo.castShadow = true;
  tree.add(crownTwo);
  tree.userData.sway = 0.35 + random() * 0.45;
  group.add(tree);
  foliage.push(tree);
  return tree;
}

function addGardenBed(group, x, z, angle, heightFn, materials, random) {
  const bed = new THREE.Group();
  bed.position.set(x, heightFn(x, z) + 0.04, z);
  bed.rotation.y = angle;
  const soil = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.15), materials.soil);
  soil.receiveShadow = true;
  bed.add(soil);
  for (let i = 0; i < 8; i += 1) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.34 + random() * 0.14, 5), materials.leafLight);
    stem.position.set(-1.35 + (i % 4) * 0.9, 0.24, -0.3 + Math.floor(i / 4) * 0.58);
    bed.add(stem);
    if (i % 3 === 0) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5), materials.flower);
      flower.position.set(stem.position.x, stem.position.y + 0.12, stem.position.z);
      bed.add(flower);
    }
  }
  group.add(bed);
}

export function createTerrain({ materials = createMaterials() } = {}) {
  const group = new THREE.Group();
  group.name = 'rolling-terrain';
  const random = mulberry32(1103);
  const geometry = new THREE.PlaneGeometry(76, 62, 56, 48);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, terrainHeight(x, z));
  }
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, materials.grass);
  ground.receiveShadow = true;
  group.add(ground);

  const pathGroup = new THREE.Group();
  pathGroup.name = 'paths-and-lanes';
  const paths = [
    [[-36, 17], [-25, 13], [-14, 8], [-6, 4], [1, 0], [8, -7], [8, -14]],
    [[-8, 4], [-15, -2], [-25, -4], [-35, -1]],
    [[-8, 4], [-4, 11], [7, 14], [20, 13], [35, 17]],
    [[1, 0], [10, 3], [22, 3], [34, -1]],
    [[8, -7], [18, -12], [28, -11], [36, -6]],
  ];
  for (const path of paths) addRibbon(pathGroup, path, path === paths[0] ? 2.25 : 1.35, materials.path, terrainHeight);
  group.add(pathGroup);

  const hedgeGroup = new THREE.Group();
  hedgeGroup.name = 'hedgerows';
  const hedges = [
    [[-22, 11], [-22, 2]], [[-18, -4], [-18, -13]], [[-2, 13], [5, 13]], [[15, 9], [15, 14]],
    [[24, 4], [24, -4]], [[25, -15], [34, -15]], [[-35, 4], [-29, 4]], [[12, -22], [20, -22]],
  ];
  for (const [a, b] of hedges) addHedge(hedgeGroup, a, b, materials.hedge, terrainHeight, 1 + random() * 0.22);
  group.add(hedgeGroup);

  const wallGroup = new THREE.Group();
  const wallPoints = [[-12, 8], [-2, 9], [6, 7], [16, 7]];
  for (let i = 0; i < wallPoints.length - 1; i += 1) {
    const [x1, z1] = wallPoints[i];
    const [x2, z2] = wallPoints[i + 1];
    const length = Math.hypot(x2 - x1, z2 - z1);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(length, 0.5, 0.42), materials.stone);
    wall.position.set((x1 + x2) / 2, terrainHeight((x1 + x2) / 2, (z1 + z2) / 2) + 0.25, (z1 + z2) / 2);
    wall.rotation.y = Math.atan2(z2 - z1, x2 - x1);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wallGroup.add(wall);
  }
  group.add(wallGroup);

  const gardenGroup = new THREE.Group();
  addGardenBed(gardenGroup, -13, 1, 0.2, terrainHeight, materials, random);
  addGardenBed(gardenGroup, 0, 15, -0.1, terrainHeight, materials, random);
  addGardenBed(gardenGroup, 23, 6, 0.35, terrainHeight, materials, random);
  addGardenBed(gardenGroup, -24, -8, -0.4, terrainHeight, materials, random);
  group.add(gardenGroup);

  const foliage = [];
  const trees = [
    [-28, 14, 1.3], [-22, 21, 1.1], [-10, 17, 1.15], [0, 21, 1.25], [16, 20, 1.15], [29, 17, 1.35],
    [-31, -8, 1.25], [-23, -17, 1.35], [-9, -17, 1.05], [22, -20, 1.3], [31, -16, 1.1],
    [2, -24, 1.18], [17, -3, 0.95],
  ];
  trees.forEach(([x, z, size], index) => addTree(group, x, z, terrainHeight, materials, size, 200 + index, foliage));

  const stoneGroup = new THREE.Group();
  for (let i = 0; i < 42; i += 1) {
    const x = -34 + random() * 68;
    const z = -25 + random() * 48;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + random() * 0.2, 0), random() > 0.5 ? materials.stone : materials.stoneLight);
    stone.position.set(x, terrainHeight(x, z) + 0.12, z);
    stone.scale.y = 0.6;
    stone.rotation.set(random(), random(), random());
    stone.castShadow = true;
    stoneGroup.add(stone);
  }
  group.add(stoneGroup);

  return {
    group,
    getHeightAt: terrainHeight,
    update(state) {
      const wind = Math.sin(state.time * 0.8) * 0.012;
      foliage.forEach((tree, index) => {
        tree.rotation.z = wind * tree.userData.sway * (index % 2 ? -1 : 1);
        tree.rotation.x = Math.cos(state.time * 0.55 + index) * 0.006 * tree.userData.sway;
      });
    },
  };
}
