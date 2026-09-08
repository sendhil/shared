import * as THREE from 'three';
import { createVillager, type Villager, type VillagerRole } from '../characters/CharacterRig';
import { HILL_HOUSE_FRONT } from './houseFront';
import { canvasGrain, PALETTE, seeded, shadow, stylizedMaterial, variedColor } from './materials';
import { NIGHT_SKY_ACCENT } from './skyDesign';

export const terrainHeight = (x: number, z: number): number =>
  Math.sin(x * 0.12 + z * 0.06) * 0.46
  + Math.cos(z * 0.18 - x * 0.05) * 0.32
  + Math.sin((x + z) * 0.31) * 0.12
  - Math.exp(-((x - 4) ** 2 + (z + 2) ** 2) / 38) * 0.65;

export type WorldHandles = {
  root: THREE.Group;
  houseAnchor: THREE.Object3D;
  partyAnchor: THREE.Object3D;
  rumorAnchor: THREE.Object3D;
  hilltopAnchor: THREE.Object3D;
  hero: Villager;
  villagers: Villager[];
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  windows: THREE.MeshStandardMaterial[];
  door: THREE.MeshStandardMaterial;
  treasure: THREE.MeshStandardMaterial;
  treasureLight: THREE.PointLight;
  moon: THREE.Mesh;
  moonHalo: THREE.Mesh;
  lanterns: THREE.PointLight[];
  gardenLights: THREE.PointLight[];
};

const placeAtGround = (object: THREE.Object3D, x: number, z: number, yOffset = 0): void => {
  object.position.set(x, terrainHeight(x, z) + yOffset, z);
};

const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
};

function createTerrain(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(94, 72, 118, 90);
  const position = geometry.attributes.position;
  const colors: number[] = [];
  const random = seeded(92);
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getY(index);
    const h = terrainHeight(x, z);
    position.setZ(index, h);
    const base = h < -0.28 ? '#3e7755' : h > 0.55 ? '#5f8651' : '#6f9a56';
    const color = variedColor(base, 0.13, random);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    flatShading: true,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  return ground;
}

function createPath(points: THREE.Vector3[]): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geometry = new THREE.TubeGeometry(curve, 80, 0.72, 7, false);
  const material = stylizedMaterial('#b99a6a', { roughness: 1, map: canvasGrain(3, ['#b99a6a', '#8c6f4c', '#d3b887']) });
  const path = new THREE.Mesh(geometry, material);
  path.receiveShadow = true;
  return path;
}

function createCottage(seed: number): THREE.Group {
  const random = seeded(seed);
  const root = new THREE.Group();
  const width = 2.5 + random() * 1.25;
  const depth = 2.15 + random() * 1.1;
  const height = 1.8 + random() * 0.55;
  const plaster = stylizedMaterial(variedColor(PALETTE.plaster, 0.12, random), {
    map: canvasGrain(seed + 15, ['#d7c6a2', '#bda781', '#e9d8b5']),
  });
  const roof = stylizedMaterial(variedColor(PALETTE.clayRoof, 0.18, random), {
    map: canvasGrain(seed + 27, ['#8a5d4d', '#6f493e', '#b07659']),
  });
  const timber = stylizedMaterial(PALETTE.timber);
  const windowMaterial = new THREE.MeshStandardMaterial({ color: '#f5b964', emissive: '#dc821d', emissiveIntensity: 0.48, roughness: 0.6 });

  root.add(mesh(new THREE.BoxGeometry(width, height, depth), plaster, 0, height / 2, 0));
  const roofMesh = mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.95, 1.45, 4), roof, 0, height + 0.65, 0);
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.scale.z = 0.85;
  root.add(roofMesh);

  const door = mesh(new THREE.BoxGeometry(0.48, 0.86, 0.08), timber, 0, 0.43, depth / 2 + 0.04);
  root.add(door);
  for (const side of [-1, 1]) {
    const window = mesh(new THREE.CircleGeometry(0.28, 10), windowMaterial, side * width * 0.28, height * 0.56, depth / 2 + 0.055);
    root.add(window);
  }
  const chimney = mesh(new THREE.CylinderGeometry(0.18, 0.23, 1.45, 6), stylizedMaterial('#785e54'), width * 0.25, height + 1.2, -depth * 0.18);
  root.add(chimney);
  return shadow(root);
}

function createTree(seed: number, large = false): THREE.Group {
  const random = seeded(seed);
  const root = new THREE.Group();
  const scale = (large ? 1.35 : 0.85) + random() * 0.45;
  const trunk = mesh(new THREE.CylinderGeometry(0.16 * scale, 0.25 * scale, 2.1 * scale, 7), stylizedMaterial(variedColor('#5f402e', 0.12, random)), 0, 1.05 * scale, 0);
  root.add(trunk);
  const leaves = [
    { y: 2.1, r: 1.18 },
    { y: 2.72, r: 0.95 },
    { y: 3.22, r: 0.64 },
  ];
  for (const layer of leaves) {
    const foliage = mesh(
      new THREE.DodecahedronGeometry(layer.r * scale, 1),
      stylizedMaterial(variedColor(random() > 0.52 ? '#376e43' : '#4d814b', 0.18, random)),
      (random() - 0.5) * 0.34,
      layer.y * scale,
      (random() - 0.5) * 0.34,
    );
    foliage.scale.y = 0.76;
    root.add(foliage);
  }
  return shadow(root);
}

function createHouse(): { root: THREE.Group; windows: THREE.MeshStandardMaterial[]; door: THREE.MeshStandardMaterial; treasure: THREE.MeshStandardMaterial; treasureLight: THREE.PointLight } {
  const root = new THREE.Group();
  const windows: THREE.MeshStandardMaterial[] = [];
  const mound = mesh(new THREE.SphereGeometry(6.6, 36, 22), stylizedMaterial('#4f7445', {
    map: canvasGrain(54, ['#4f7445', '#6c914d', '#345b3e']),
  }), 0, 1.8, -0.8);
  mound.scale.set(1.12, 0.62, 0.66);
  root.add(mound);

  const facadeShape = new THREE.Shape();
  const facadeRadius = HILL_HOUSE_FRONT.facadeRadius;
  facadeShape.moveTo(-facadeRadius, 0);
  facadeShape.lineTo(-facadeRadius, facadeRadius);
  facadeShape.absarc(0, facadeRadius, facadeRadius, Math.PI, 0, false);
  facadeShape.lineTo(facadeRadius, 0);
  facadeShape.closePath();
  const facade = mesh(new THREE.ExtrudeGeometry(facadeShape, { depth: 0.36, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.06, bevelThickness: 0.06 }), stylizedMaterial('#c3b17c'), 0, 0.16, HILL_HOUSE_FRONT.facadeZ);
  root.add(facade);

  const doorMaterial = stylizedMaterial('#355a43', { emissive: '#183425', emissiveIntensity: 0.12, roughness: 0.72, map: canvasGrain(61, ['#355a43', '#254637', '#5a7652']) });
  const door = mesh(new THREE.CircleGeometry(HILL_HOUSE_FRONT.doorRadius, 32), doorMaterial, 0, HILL_HOUSE_FRONT.doorCenterY, HILL_HOUSE_FRONT.doorZ);
  root.add(door);
  const doorRing = mesh(new THREE.TorusGeometry(HILL_HOUSE_FRONT.doorRadius + 0.14, 0.13, 7, 32), stylizedMaterial('#8e795d'), 0, HILL_HOUSE_FRONT.doorCenterY, HILL_HOUSE_FRONT.doorZ + 0.035);
  root.add(doorRing);
  for (const y of [1.1, 1.66, 2.22]) {
    root.add(mesh(new THREE.BoxGeometry(2.2, 0.06, 0.04), stylizedMaterial('#234333'), 0, y, HILL_HOUSE_FRONT.doorZ + 0.06));
  }
  const knob = mesh(new THREE.SphereGeometry(0.12, 9, 7), stylizedMaterial('#d1ad4a', { metalness: 0.6, roughness: 0.32 }), 0.74, 1.54, HILL_HOUSE_FRONT.doorZ + 0.16);
  root.add(knob);
  for (let leaf = 0; leaf < 14; leaf += 1) {
    const angle = leaf / 14 * Math.PI * 2 + 0.2;
    const ivy = mesh(new THREE.SphereGeometry(0.11, 7, 6), stylizedMaterial(leaf % 2 ? '#3d7442' : '#608a4c'), Math.cos(angle) * 1.86, HILL_HOUSE_FRONT.doorCenterY + Math.sin(angle) * 1.86, HILL_HOUSE_FRONT.doorZ + 0.18);
    ivy.scale.set(0.8, 1.3, 0.5);
    root.add(ivy);
  }

  for (const x of [-2.88, 2.88]) {
    const windowMaterial = new THREE.MeshStandardMaterial({ color: '#ffd487', emissive: '#e89433', emissiveIntensity: 0.85, roughness: 0.45 });
    windows.push(windowMaterial);
    const ring = mesh(new THREE.TorusGeometry(0.7, 0.1, 7, 20), stylizedMaterial('#806a52'), x, 2.05, HILL_HOUSE_FRONT.facadeZ + 0.4);
    const window = mesh(new THREE.CircleGeometry(0.67, 18), windowMaterial, x, 2.05, HILL_HOUSE_FRONT.facadeZ + 0.44);
    root.add(ring, window);
  }
  const chimney = mesh(new THREE.CylinderGeometry(0.34, 0.42, 2.9, 7), stylizedMaterial('#71625a'), 2.8, 3.6, -0.8);
  chimney.rotation.z = -0.1;
  root.add(chimney);

  const terrace = mesh(new THREE.CylinderGeometry(4.45, 4.9, 0.34, 28), stylizedMaterial('#806e58'), 0, 0.1, HILL_HOUSE_FRONT.facadeZ - 0.85);
  terrace.scale.z = 0.44;
  root.add(terrace);

  const treasure = new THREE.MeshStandardMaterial({ color: '#c4a549', emissive: '#9b6520', emissiveIntensity: 0.25, metalness: 0.68, roughness: 0.26 });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const keepsake = mesh(new THREE.IcosahedronGeometry(0.16 + (index % 3) * 0.07, 1), treasure, Math.cos(angle) * 3.6, -0.12 + (index % 2) * 0.06, 2.1 + Math.sin(angle) * 2);
    root.add(keepsake);
  }
  for (const [x, y, z] of [[-1.65, 0.38, 4.6], [1.7, 0.42, 4.6], [-2.25, 0.66, 3.5], [2.24, 0.62, 3.4]]) {
    root.add(mesh(new THREE.IcosahedronGeometry(0.16, 1), treasure, x, y, z));
  }
  const treasureLight = new THREE.PointLight('#d69e3c', 0.2, 6.8, 2);
  treasureLight.position.set(0, 1.1, HILL_HOUSE_FRONT.doorZ + 0.42);
  root.add(treasureLight);
  return { root: shadow(root), windows, door: doorMaterial, treasure, treasureLight };
}

function createGarden(): THREE.Group {
  const root = new THREE.Group();
  const soil = stylizedMaterial('#704e37');
  const leaf = stylizedMaterial('#4e8046');
  const flower = [stylizedMaterial('#df7f78'), stylizedMaterial('#e8c05e'), stylizedMaterial('#8aa4d2')];
  for (let row = 0; row < 4; row += 1) {
    const bed = mesh(new THREE.BoxGeometry(2.5, 0.18, 0.64), soil, -3.35, 0.1, row * 0.9 - 1.25);
    root.add(bed);
    for (let item = 0; item < 9; item += 1) {
      const stem = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.38 + (item % 3) * 0.06, 5), leaf, -4.35 + item * 0.25, 0.3, row * 0.9 - 1.25);
      const blossom = mesh(new THREE.DodecahedronGeometry(0.09, 0), flower[(row + item) % flower.length], -4.35 + item * 0.25, 0.53 + (item % 3) * 0.06, row * 0.9 - 1.25);
      root.add(stem, blossom);
    }
  }
  return shadow(root);
}

function createParty(): { root: THREE.Group; lanterns: THREE.PointLight[]; gardenLights: THREE.PointLight[] } {
  const root = new THREE.Group();
  const lanterns: THREE.PointLight[] = [];
  const gardenLights: THREE.PointLight[] = [];
  const tableMat = stylizedMaterial('#6b4730');
  const clothMat = stylizedMaterial('#d6a955');
  const cakeMat = stylizedMaterial('#f0c28f');

  for (let tableIndex = 0; tableIndex < 3; tableIndex += 1) {
    const angle = -0.9 + tableIndex * 0.9;
    const x = Math.sin(angle) * 3.7;
    const z = 6 + Math.cos(angle) * 2.4;
    const table = new THREE.Group();
    table.add(mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.13, 12), tableMat, 0, 0.92, 0));
    table.add(mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.9, 7), tableMat, 0, 0.45, 0));
    const cloth = mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.15, 12), clothMat, 0, 1.04, 0);
    table.add(cloth);
    if (tableIndex === 1) {
      const cake = mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.24, 16), cakeMat, 0, 1.2, 0);
      table.add(cake);
      for (let candleIndex = 0; candleIndex < 5; candleIndex += 1) {
        const candle = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 5), stylizedMaterial('#fcdf8e'), (candleIndex - 2) * 0.1, 1.35, 0);
        table.add(candle);
      }
    }
    placeAtGround(table, x, z);
    root.add(table);
  }

  const ropeMat = stylizedMaterial('#6c5641');
  for (const side of [-1, 1]) {
    const post = mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.8, 6), ropeMat, side * 7.1, 1.9, 6.5);
    root.add(post);
  }
  const rope = mesh(new THREE.CylinderGeometry(0.035, 0.035, 14.1, 6), ropeMat, 0, 3.25, 6.5);
  rope.rotation.z = Math.PI / 2;
  root.add(rope);
  const buntingColors = ['#cf6f55', '#e2bd59', '#557d88', '#9b687d'];
  for (let flag = 0; flag < 13; flag += 1) {
    const flagMesh = mesh(new THREE.ConeGeometry(0.26, 0.52, 3), stylizedMaterial(buntingColors[flag % buntingColors.length]), -6.45 + flag * 1.08, 3.05 - Math.sin((flag / 12) * Math.PI) * 0.36, 6.5);
    flagMesh.rotation.z = Math.PI;
    flagMesh.rotation.y = Math.PI / 2;
    root.add(flagMesh);
  }

  for (let index = 0; index < 7; index += 1) {
    const x = -5 + index * 1.65;
    const lantern = mesh(new THREE.SphereGeometry(0.16, 9, 7), new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#f3a640', emissiveIntensity: 1.2 }), x, 2.73 + Math.sin(index) * 0.16, 6.5);
    root.add(lantern);
    const light = new THREE.PointLight('#f0a640', 1.25, 8, 2);
    light.position.copy(lantern.position);
    root.add(light);
    lanterns.push(light);
  }

  for (const position of [[-4.8, 5.3], [4.1, 7.5], [1.4, 2.9]]) {
    const glow = new THREE.PointLight('#f2b15a', 1.1, 6, 2);
    glow.position.set(position[0], 1.25, position[1]);
    root.add(glow);
    gardenLights.push(glow);
  }
  return { root: shadow(root), lanterns, gardenLights };
}

function addGrassAndFlowers(root: THREE.Group): void {
  const random = seeded(419);
  const bladeGeometry = new THREE.ConeGeometry(0.035, 0.52, 3);
  const bladeMaterial = stylizedMaterial('#4f814c');
  const blades = new THREE.InstancedMesh(bladeGeometry, bladeMaterial, 720);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < 720; index += 1) {
    const x = (random() - 0.5) * 82;
    const z = (random() - 0.5) * 61;
    const nearPath = Math.abs(x - z * 0.24 + 1.4) < 1.4;
    const nearHouse = (x - 2) ** 2 + (z + 1) ** 2 < 48;
    if (nearPath || nearHouse) {
      matrix.makeScale(0, 0, 0);
    } else {
      matrix.compose(
        new THREE.Vector3(x, terrainHeight(x, z) + 0.21, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 0.28, random() * Math.PI, random() * 0.2)),
        new THREE.Vector3(0.6 + random() * 1.2, 0.7 + random() * 1.4, 0.6 + random() * 1.2),
      );
    }
    blades.setMatrixAt(index, matrix);
  }
  blades.castShadow = true;
  blades.receiveShadow = true;
  root.add(blades);

  const flowerGeometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const flowerPalette = ['#e0a0a7', '#f5d676', '#b89cd9', '#e98963'];
  for (let index = 0; index < 330; index += 1) {
    const x = (random() - 0.5) * 62;
    const z = (random() - 0.5) * 45;
    positions.push(x, terrainHeight(x, z) + 0.25 + random() * 0.14, z);
    const color = new THREE.Color(flowerPalette[index % flowerPalette.length]);
    colors.push(color.r, color.g, color.b);
  }
  flowerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  flowerGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  root.add(new THREE.Points(flowerGeometry, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.92, sizeAttenuation: true })));
}

function addVillage(root: THREE.Group): void {
  const cottagePlaces = [
    [-14, 4, -0.18], [-9.2, -7.5, 0.56], [-16.5, -9.5, 0.14], [13, -9, -0.45], [17.2, 3.2, -0.86], [11.5, 10.5, 0.32], [-16.2, 12.5, -0.5],
  ];
  cottagePlaces.forEach(([x, z, rotation], index) => {
    const cottage = createCottage(120 + index * 17);
    placeAtGround(cottage, x, z);
    cottage.rotation.y = rotation;
    root.add(cottage);
  });
  const treePlaces = [[-22, 14], [-25, -7], [-18, 0], [-10, 15], [-5, -17], [7, -15], [15, -3], [22, 14], [19, -14], [4, 16], [-30, 5], [28, 3], [-26, 18], [27, 18]];
  treePlaces.forEach(([x, z], index) => {
    const tree = createTree(240 + index * 13, index % 4 === 0);
    placeAtGround(tree, x, z);
    root.add(tree);
  });
  for (let index = 0; index < 24; index += 1) {
    const angle = index * 2.399;
    const radius = 19 + (index % 5) * 2.4;
    const stone = mesh(new THREE.DodecahedronGeometry(0.14 + (index % 3) * 0.08, 0), stylizedMaterial(index % 2 ? '#687168' : '#8b8774'));
    placeAtGround(stone, Math.cos(angle) * radius, Math.sin(angle) * radius);
    stone.position.y += 0.1;
    stone.rotation.set(index, index * 0.3, index * 0.17);
    root.add(stone);
  }
}

function createCart(): THREE.Group {
  const root = new THREE.Group();
  const wood = stylizedMaterial('#705039');
  const cloth = stylizedMaterial('#d9b55d');
  root.add(mesh(new THREE.BoxGeometry(2.1, 0.55, 1.2), wood, 0, 0.9, 0));
  root.add(mesh(new THREE.BoxGeometry(2.5, 0.08, 0.08), wood, 0, 0.72, -0.55));
  for (const x of [-0.76, 0.76]) {
    const wheel = mesh(new THREE.TorusGeometry(0.38, 0.08, 6, 12), stylizedMaterial('#3f332d'), x, 0.4, 0);
    wheel.rotation.y = Math.PI / 2;
    root.add(wheel);
  }
  const canopy = mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 12), cloth, 0, 2.14, 0);
  canopy.scale.z = 0.55;
  root.add(canopy);
  for (const x of [-0.92, 0.92]) root.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.3, 5), wood, x, 1.5, 0));
  return shadow(root);
}

function createMoon(): { moon: THREE.Mesh; moonHalo: THREE.Mesh } {
  const moonMaterial = new THREE.MeshBasicMaterial({ color: '#d8ecf3', transparent: true, opacity: 0, depthWrite: false, fog: NIGHT_SKY_ACCENT.usesFog });
  const haloMaterial = new THREE.MeshBasicMaterial({ color: '#89b8cd', transparent: true, opacity: 0, depthWrite: false, fog: NIGHT_SKY_ACCENT.usesFog });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(NIGHT_SKY_ACCENT.radius, 20, 14), moonMaterial);
  const moonHalo = new THREE.Mesh(new THREE.SphereGeometry(NIGHT_SKY_ACCENT.radius * 1.65, 20, 14), haloMaterial);
  moon.position.set(...NIGHT_SKY_ACCENT.position);
  moonHalo.position.copy(moon.position);
  moon.renderOrder = 2;
  moonHalo.renderOrder = 1;
  return { moon, moonHalo };
}

export function buildWorld(scene: THREE.Scene): WorldHandles {
  const root = new THREE.Group();
  root.name = 'Hillside story world';
  scene.add(root);
  root.add(createTerrain());

  const pathPoints = [[-34, -20], [-23, -12], [-12, -4], [-4, 1.6], [2, 4.2], [7, 4.5], [14, 8.7], [27, 18]].map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.13, z));
  root.add(createPath(pathPoints));
  addGrassAndFlowers(root);
  addVillage(root);

  const houseAnchor = new THREE.Object3D();
  placeAtGround(houseAnchor, 3.1, -1.2);
  const house = createHouse();
  houseAnchor.add(house.root);
  root.add(houseAnchor);

  const garden = createGarden();
  placeAtGround(garden, 2.8, -0.6);
  garden.position.x += 0.1;
  garden.position.z -= 4.5;
  root.add(garden);

  const partyAnchor = new THREE.Object3D();
  const party = createParty();
  partyAnchor.add(party.root);
  placeAtGround(partyAnchor, 0, 0);
  root.add(partyAnchor);

  const cart = createCart();
  placeAtGround(cart, -7.2, 2.2);
  cart.rotation.y = 0.2;
  root.add(cart);

  const hero = createVillager(8, 'host', 1.22);
  placeAtGround(hero.root, 3.1, 4.1);
  hero.base.copy(hero.root.position);
  hero.root.rotation.y = Math.PI;
  root.add(hero.root);

  const villagerData: Array<[number, number, number, VillagerRole, number]> = [
    [-4.3, 5.5, 0.2, 'carry', 0], [-2.8, 7.4, -0.6, 'greet', 1], [1.2, 8.3, -2.8, 'greet', 2], [4.8, 6.9, 2.6, 'arrange', 3], [7.5, 4.1, -2.0, 'watch', 4], [-6.2, 8.9, 0.75, 'carry', 5], [-1.3, 2.8, 2.4, 'arrange', 6], [8.1, 8.6, -2.5, 'whisper', 7], [9.6, 7.6, -2.65, 'whisper', 8], [-10.4, 3.1, 1.2, 'watch', 9], [3.2, 10.4, 3.1, 'watch', 10], [-8.4, 11.3, -1.6, 'greet', 11], [11.4, 1.7, -2.8, 'watch', 12], [-12.3, -0.5, 0.6, 'carry', 13],
  ];
  const villagers = villagerData.map(([x, z, rotation, role, seed], index) => {
    const villager = createVillager(56 + seed * 31, role, 0.84 + (index % 3) * 0.08);
    placeAtGround(villager.root, x, z);
    villager.base.copy(villager.root.position);
    villager.root.rotation.y = rotation;
    root.add(villager.root);
    return villager;
  });

  const rumorAnchor = new THREE.Object3D();
  rumorAnchor.position.set(8.8, terrainHeight(8.8, 7.6) + 1.2, 7.6);
  root.add(rumorAnchor);
  const hilltopAnchor = new THREE.Object3D();
  hilltopAnchor.position.set(3.1, houseAnchor.position.y + 3.0, -1.2);
  root.add(hilltopAnchor);

  const sun = new THREE.DirectionalLight('#ffe5ae', 3.1);
  sun.position.set(-18, 25, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -36;
  sun.shadow.camera.right = 36;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -22;
  sun.shadow.bias = -0.0003;
  root.add(sun);
  const hemi = new THREE.HemisphereLight('#a8cfdf', '#25422e', 2.05);
  root.add(hemi);
  const moon = createMoon();
  root.add(moon.moonHalo, moon.moon);

  return { root, houseAnchor, partyAnchor, rumorAnchor, hilltopAnchor, hero, villagers, sun, hemi, windows: house.windows, door: house.door, treasure: house.treasure, treasureLight: house.treasureLight, moon: moon.moon, moonHalo: moon.moonHalo, lanterns: party.lanterns, gardenLights: party.gardenLights };
}
