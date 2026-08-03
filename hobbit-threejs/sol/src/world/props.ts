import {
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  Object3D,
  Path,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { WorldMaterials } from './materials';
import { randomRange } from './random';
import { terrainHeightAt } from './terrain';
import { transformTuple, type TransformTuple } from './types';

export const PROP_KINDS = Object.freeze([
  'path-stone', 'bridge', 'field-card', 'fence', 'garden-row', 'party-table', 'cart',
  'lantern-arch', 'invitation', 'flower-basket', 'tool', 'ribbon-spool', 'laundry', 'lantern',
] as const);
export type PropKind = (typeof PROP_KINDS)[number];

export type PropPlacement = Readonly<{
  id: string;
  kind: PropKind;
  transform: TransformTuple;
}>;

function placement(id: string, kind: PropKind, transform: TransformTuple): PropPlacement {
  return Object.freeze({ id, kind, transform });
}

function groundedTransform(seed: number, x: number, z: number, rotationY: number, scale = 1, lift = 0): TransformTuple {
  return transformTuple(x, terrainHeightAt(x, z, seed) + lift, z, 0, rotationY, 0, scale, scale, scale);
}

export function createPropPlacements(seed = 111): readonly PropPlacement[] {
  const props: PropPlacement[] = [];

  for (let index = 0; index < 28; index += 1) {
    const z = -25 + index * 1.78;
    const x = 8 + z * 0.18 + randomRange(seed, 10000 + index, -0.34, 0.34);
    props.push(placement(`path-stone-${index + 1}`, 'path-stone', groundedTransform(seed, x, z, randomRange(seed, 10100 + index, -Math.PI, Math.PI), randomRange(seed, 10200 + index, 0.68, 1.28), 0.035)));
  }
  props.push(placement('pond-bridge', 'bridge', groundedTransform(seed, -12.7, 10.1, 0.43, 1, 0.05)));

  for (let index = 0; index < 8; index += 1) {
    const x = 21.5 + (index % 4) * 2.5;
    const z = 12 + Math.floor(index / 4) * 6.4;
    props.push(placement(`field-card-${index + 1}`, 'field-card', groundedTransform(seed, x, z, randomRange(seed, 10300 + index, -0.1, 0.1), randomRange(seed, 10400 + index, 0.85, 1.18))));
  }

  for (let index = 0; index < 18; index += 1) {
    const x = -27 + index * 3.05;
    const z = index % 2 === 0 ? 22.5 : -22.5;
    props.push(placement(`fence-${index + 1}`, 'fence', groundedTransform(seed, x, z, Math.PI / 2 + randomRange(seed, 10500 + index, -0.08, 0.08), randomRange(seed, 10600 + index, 0.88, 1.12))));
  }

  for (let index = 0; index < 6; index += 1) {
    const x = 12 + index * 1.15;
    const z = -9.6 + index * 0.2;
    props.push(placement(`garden-row-${index + 1}`, 'garden-row', groundedTransform(seed, x, z, -0.15, 1)));
  }

  [[7.1, -4.8, 0.1], [9.6, -3.5, -0.18], [6.3, -1.9, 0.32]].forEach(([x, z, rotation], index) => {
    props.push(placement(`party-table-${index + 1}`, 'party-table', groundedTransform(seed, x, z, rotation, 1)));
  });
  props.push(placement('produce-cart', 'cart', groundedTransform(seed, 12.4, 7.1, -0.62, 1, 0.03)));
  props.push(placement('celebration-arch', 'lantern-arch', groundedTransform(seed, 4.8, -8.5, 0.08, 1)));
  props.push(placement('gold-edged-invitation', 'invitation', transformTuple(0.7, terrainHeightAt(0.7, -5.32, seed) + 1.72, -5.32, 0, 0.08, 0, 1, 1, 1)));

  [[-4.5, -3.5], [7.4, -6.7], [11.2, -1.5]].forEach(([x, z], index) => {
    props.push(placement(`flower-basket-${index + 1}`, 'flower-basket', groundedTransform(seed, x, z, randomRange(seed, 10700 + index, -Math.PI, Math.PI), 1)));
  });

  [[-7.8, 1.2], [4.1, -9.5], [13.5, -4.1], [-1.5, 2.8], [9.4, 6.8], [-13, -4.2]].forEach(([x, z], index) => {
    props.push(placement(`tool-${index + 1}`, 'tool', groundedTransform(seed, x, z, randomRange(seed, 10800 + index, -Math.PI, Math.PI), randomRange(seed, 10900 + index, 0.88, 1.08))));
  });

  [[3.8, -5.9], [7.8, -2.1], [-6.1, -1.2], [10.7, 5.5]].forEach(([x, z], index) => {
    props.push(placement(`ribbon-spool-${index + 1}`, 'ribbon-spool', groundedTransform(seed, x, z, randomRange(seed, 11000 + index, -Math.PI, Math.PI), 1)));
  });

  props.push(placement('orchard-laundry', 'laundry', groundedTransform(seed, -14.1, -8.2, 0.2, 1)));
  props.push(placement('croft-laundry', 'laundry', groundedTransform(seed, 16.4, 10.5, -0.55, 0.88)));

  for (let index = 0; index < 10; index += 1) {
    const angle = index / 10 * Math.PI * 2;
    const radius = 9.5 + (index % 3) * 1.3;
    const x = Math.sin(angle) * radius + 2;
    const z = Math.cos(angle) * radius - 2;
    props.push(placement(`lane-lantern-${index + 1}`, 'lantern', groundedTransform(seed, x, z, -angle, randomRange(seed, 11100 + index, 0.82, 1.12))));
  }

  return Object.freeze(props);
}

function roundedPanel(width: number, height: number, depth: number): ExtrudeGeometry {
  const radius = Math.min(width, height) * 0.14;
  const shape = new Shape();
  shape.moveTo(-width / 2 + radius, -height / 2);
  shape.lineTo(width / 2 - radius, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
  shape.lineTo(width / 2, height / 2 - radius);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
  shape.lineTo(-width / 2 + radius, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
  shape.lineTo(-width / 2, -height / 2 + radius);
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: Math.min(depth * 0.3, 0.05), bevelThickness: Math.min(depth * 0.25, 0.035), bevelSegments: 2 });
}

function cylinderBetween(start: Vector3, end: Vector3, radius: number, material: WorldMaterials['wood']): Mesh {
  const length = start.distanceTo(end);
  const mesh = new Mesh(new CylinderGeometry(radius * 0.86, radius, length, 7), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), end.clone().sub(start).normalize());
  mesh.castShadow = true;
  return mesh;
}

function pathStone(materials: WorldMaterials): Group {
  const group = new Group();
  const stone = new Mesh(new IcosahedronGeometry(0.48, 1), materials.stone);
  stone.scale.set(1.15, 0.19, 0.8);
  stone.name = 'detail:irregular-path-stone';
  stone.receiveShadow = true;
  group.add(stone);
  return group;
}

function archedBridge(materials: WorldMaterials): Group {
  const group = new Group();
  const silhouette = new Shape();
  silhouette.moveTo(-2.2, 0);
  silhouette.lineTo(-2.2, 0.38);
  silhouette.quadraticCurveTo(0, 1.25, 2.2, 0.38);
  silhouette.lineTo(2.2, 0);
  silhouette.lineTo(-2.2, 0);
  const arch = new Path();
  arch.moveTo(-1.25, 0);
  arch.quadraticCurveTo(0, 1.12, 1.25, 0);
  silhouette.holes.push(arch);
  const bridge = new Mesh(new ExtrudeGeometry(silhouette, { depth: 1.5, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 2 }), materials.stone);
  bridge.position.z = -0.75;
  bridge.name = 'detail:stone-arch-bridge';
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  const railCurve = new CatmullRomCurve3([new Vector3(-2.05, 0.55, -0.88), new Vector3(0, 1.42, -0.88), new Vector3(2.05, 0.55, -0.88)]);
  const nearRail = new Mesh(new TubeGeometry(railCurve, 16, 0.055, 6, false), materials.copper);
  const farRail = nearRail.clone();
  farRail.position.z = 1.76;
  nearRail.name = 'detail:bridge-copper-rail';
  farRail.name = 'detail:bridge-copper-rail';
  group.add(bridge, nearRail, farRail);
  return group;
}

function fieldCard(materials: WorldMaterials): Group {
  const group = new Group();
  const card = new Mesh(roundedPanel(2.1, 0.08, 2.7), materials.soil);
  card.rotation.x = Math.PI / 2;
  card.position.y = 0.035;
  card.name = 'detail:raised-field-card';
  group.add(card);
  for (let row = 0; row < 4; row += 1) {
    const crop = new Mesh(new TubeGeometry(new CatmullRomCurve3([new Vector3(-0.82, 0.11, -0.95 + row * 0.58), new Vector3(0, 0.15, -0.9 + row * 0.58), new Vector3(0.82, 0.11, -0.95 + row * 0.58)]), 8, 0.035, 5, false), row % 2 ? materials.foliageLight : materials.flowerGold);
    crop.name = 'detail:field-crop-row';
    group.add(crop);
  }
  return group;
}

function fence(materials: WorldMaterials): Group {
  const group = new Group();
  const left = cylinderBetween(new Vector3(-0.9, 0, 0), new Vector3(-0.88, 1.18, 0), 0.07, materials.fence);
  const right = cylinderBetween(new Vector3(0.9, 0, 0), new Vector3(0.92, 1.12, 0), 0.07, materials.fence);
  const railA = cylinderBetween(new Vector3(-0.9, 0.38, 0), new Vector3(0.9, 0.43, 0), 0.055, materials.fence);
  const railB = cylinderBetween(new Vector3(-0.88, 0.82, 0), new Vector3(0.91, 0.77, 0), 0.05, materials.fence);
  group.add(left, right, railA, railB);
  return group;
}

function gardenRow(materials: WorldMaterials): Group {
  const group = new Group();
  const furrow = new Mesh(new TubeGeometry(new CatmullRomCurve3([new Vector3(-1.7, 0.03, -0.12), new Vector3(0, 0.07, 0.08), new Vector3(1.7, 0.03, -0.08)]), 12, 0.11, 6, false), materials.soil);
  furrow.scale.y = 0.35;
  furrow.name = 'detail:garden-furrow';
  group.add(furrow);
  for (let index = 0; index < 7; index += 1) {
    const sprout = new Mesh(new ConeGeometry(0.09, 0.33, 5), index % 2 ? materials.foliageLight : materials.foliage);
    sprout.position.set(-1.45 + index * 0.48, 0.18, Math.sin(index * 2.1) * 0.08);
    sprout.name = 'detail:garden-sprout';
    group.add(sprout);
  }
  return group;
}

function partyTable(materials: WorldMaterials): Group {
  const group = new Group();
  const top = new Mesh(roundedPanel(2.5, 0.95, 0.14), materials.wood);
  top.rotation.x = Math.PI / 2;
  top.position.set(0, 1.08, 0.48);
  top.name = 'detail:beveled-party-tabletop';
  group.add(top);
  const legProfile = [new Vector2(0.1, 0), new Vector2(0.12, 0.15), new Vector2(0.085, 0.82), new Vector2(0.14, 0.96)];
  for (const x of [-0.92, 0.92]) {
    for (const z of [-0.31, 0.31]) {
      const leg = new Mesh(new LatheGeometry(legProfile, 8), materials.wood);
      leg.position.set(x, 0.05, z);
      leg.name = 'detail:turned-table-leg';
      group.add(leg);
    }
  }
  return group;
}

function cart(materials: WorldMaterials): Group {
  const group = new Group();
  const body = new Mesh(roundedPanel(1.8, 0.82, 0.32), materials.wood);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.72, 0.4);
  body.name = 'detail:cart-body';
  group.add(body);
  for (const x of [-0.9, 0.9]) {
    const wheel = new Mesh(new TorusGeometry(0.47, 0.075, 8, 22), materials.darkMetal);
    wheel.position.set(x, 0.48, 0);
    wheel.rotation.y = Math.PI / 2;
    wheel.name = 'detail:spoked-cart-wheel';
    group.add(wheel);
    for (let spoke = 0; spoke < 6; spoke += 1) {
      const angle = spoke / 6 * Math.PI * 2;
      const spokeMesh = cylinderBetween(new Vector3(x, 0.48, 0), new Vector3(x, 0.48 + Math.sin(angle) * 0.4, Math.cos(angle) * 0.4), 0.025, materials.wood);
      group.add(spokeMesh);
    }
  }
  const handleA = cylinderBetween(new Vector3(-0.62, 0.62, 0.2), new Vector3(-0.62, 0.34, -1.75), 0.04, materials.wood);
  const handleB = cylinderBetween(new Vector3(0.62, 0.62, 0.2), new Vector3(0.62, 0.34, -1.75), 0.04, materials.wood);
  group.add(handleA, handleB);
  return group;
}

function lanternArch(materials: WorldMaterials): Group {
  const group = new Group();
  const archCurve = new CatmullRomCurve3([
    new Vector3(-2.2, 0, 0), new Vector3(-2, 2.2, 0), new Vector3(0, 3.35, 0), new Vector3(2, 2.2, 0), new Vector3(2.2, 0, 0),
  ]);
  const arch = new Mesh(new TubeGeometry(archCurve, 32, 0.1, 8, false), materials.wood);
  arch.name = 'detail:carpentered-lantern-arch';
  group.add(arch);
  for (const x of [-1.3, 0, 1.3]) {
    const lantern = lanternModel(materials);
    lantern.scale.setScalar(0.58);
    lantern.position.set(x, 2.48 + (x === 0 ? 0.42 : 0), 0);
    group.add(lantern);
  }
  return group;
}

function invitation(materials: WorldMaterials): Group {
  const group = new Group();
  const paper = new Mesh(roundedPanel(1.15, 1.55, 0.022), materials.paper);
  paper.name = 'detail:invitation-paper';
  const edge = new Mesh(new TorusGeometry(0.56, 0.025, 5, 28), materials.flowerGold);
  edge.scale.y = 1.34;
  edge.position.z = 0.04;
  edge.name = 'detail:gold-invitation-edge';
  const seal = new Mesh(new SphereGeometry(0.11, 12, 7), materials.doorPlum);
  seal.scale.z = 0.35;
  seal.position.set(0.28, -0.44, 0.07);
  seal.name = 'detail:wax-seal';
  const pin = new Mesh(new CylinderGeometry(0.035, 0.025, 0.22, 7), materials.copper);
  pin.rotation.x = Math.PI / 2;
  pin.position.set(0, 0.63, 0.09);
  group.add(paper, edge, seal, pin);
  return group;
}

function flowerBasket(materials: WorldMaterials): Group {
  const group = new Group();
  const profile = [new Vector2(0.18, 0), new Vector2(0.4, 0.08), new Vector2(0.5, 0.42), new Vector2(0.43, 0.55)];
  const basket = new Mesh(new LatheGeometry(profile, 14), materials.wood);
  basket.name = 'detail:woven-flower-basket';
  const handle = new Mesh(new TorusGeometry(0.43, 0.035, 6, 20, Math.PI), materials.wood);
  handle.position.y = 0.48;
  handle.rotation.z = Math.PI;
  group.add(basket, handle);
  for (let index = 0; index < 7; index += 1) {
    const flower = new Mesh(new IcosahedronGeometry(0.1, 0), index % 2 ? materials.flower : materials.flowerGold);
    flower.position.set(Math.cos(index * 2.4) * 0.3, 0.55 + (index % 3) * 0.06, Math.sin(index * 2.4) * 0.3);
    group.add(flower);
  }
  return group;
}

function tool(materials: WorldMaterials): Group {
  const group = new Group();
  const handle = cylinderBetween(new Vector3(0, 0, 0), new Vector3(0.12, 1.45, 0), 0.035, materials.wood);
  const headShape = new Shape();
  headShape.moveTo(-0.22, 0);
  headShape.quadraticCurveTo(0, -0.32, 0.22, 0);
  headShape.lineTo(0.13, 0.28);
  headShape.lineTo(-0.13, 0.28);
  const head = new Mesh(new ExtrudeGeometry(headShape, { depth: 0.055, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.01 }), materials.darkMetal);
  head.position.set(0.12, 1.38, -0.027);
  head.rotation.z = -0.08;
  head.name = 'detail:forged-tool-head';
  group.rotation.z = 0.2;
  group.add(handle, head);
  return group;
}

function ribbonSpool(materials: WorldMaterials): Group {
  const group = new Group();
  const spool = new Mesh(new CylinderGeometry(0.28, 0.28, 0.35, 18), materials.wood);
  spool.rotation.z = Math.PI / 2;
  spool.position.y = 0.29;
  spool.name = 'detail:ribbon-spool';
  const ribbon = new Mesh(new TubeGeometry(new CatmullRomCurve3([new Vector3(0.18, 0.33, 0), new Vector3(0.72, 0.2, 0.22), new Vector3(1.3, 0.13, -0.14), new Vector3(1.85, 0.08, 0.16)]), 18, 0.045, 5, false), materials.flowerGold);
  ribbon.scale.y = 0.3;
  ribbon.name = 'detail:unspooled-ribbon';
  ribbon.userData.windKind = 'ribbon';
  ribbon.userData.baseRotation = ribbon.rotation.z;
  group.add(spool, ribbon);
  return group;
}

function laundry(materials: WorldMaterials): Group {
  const group = new Group();
  const left = cylinderBetween(new Vector3(-1.7, 0, 0), new Vector3(-1.7, 2.15, 0), 0.055, materials.wood);
  const right = cylinderBetween(new Vector3(1.7, 0, 0), new Vector3(1.7, 2.15, 0), 0.055, materials.wood);
  const line = new Mesh(new TubeGeometry(new CatmullRomCurve3([new Vector3(-1.7, 1.92, 0), new Vector3(0, 1.79, 0), new Vector3(1.7, 1.92, 0)]), 12, 0.012, 4, false), materials.darkMetal);
  group.add(left, right, line);
  for (let index = 0; index < 4; index += 1) {
    const cloth = new Mesh(new PlaneGeometry(0.62, 0.78, 3, 3), index % 2 ? materials.paper : materials.flower);
    cloth.position.set(-1.15 + index * 0.78, 1.48 - Math.sin(index) * 0.05, 0.03);
    cloth.rotation.z = (index - 1.5) * 0.025;
    cloth.name = 'detail:laundry-cloth';
    cloth.userData.windKind = 'laundry';
    cloth.userData.baseRotation = cloth.rotation.z;
    group.add(cloth);
  }
  return group;
}

function lanternModel(materials: WorldMaterials): Group {
  const group = new Group();
  const profile = [new Vector2(0.05, 0), new Vector2(0.2, 0.05), new Vector2(0.24, 0.18), new Vector2(0.2, 0.24), new Vector2(0.08, 0.28)];
  const base = new Mesh(new LatheGeometry(profile, 12), materials.darkMetal);
  const glass = new Mesh(new CylinderGeometry(0.17, 0.2, 0.42, 12), materials.lanternGlass);
  glass.position.y = 0.45;
  const roof = new Mesh(new ConeGeometry(0.29, 0.25, 8), materials.copper);
  roof.position.y = 0.78;
  const loop = new Mesh(new TorusGeometry(0.13, 0.025, 5, 14, Math.PI), materials.darkMetal);
  loop.position.y = 0.95;
  loop.rotation.z = Math.PI;
  group.name = 'detail:finished-lantern';
  group.add(base, glass, roof, loop);
  return group;
}

function createPrototype(kind: PropKind, materials: WorldMaterials): Group {
  switch (kind) {
    case 'path-stone': return pathStone(materials);
    case 'bridge': return archedBridge(materials);
    case 'field-card': return fieldCard(materials);
    case 'fence': return fence(materials);
    case 'garden-row': return gardenRow(materials);
    case 'party-table': return partyTable(materials);
    case 'cart': return cart(materials);
    case 'lantern-arch': return lanternArch(materials);
    case 'invitation': return invitation(materials);
    case 'flower-basket': return flowerBasket(materials);
    case 'tool': return tool(materials);
    case 'ribbon-spool': return ribbonSpool(materials);
    case 'laundry': return laundry(materials);
    case 'lantern': return lanternModel(materials);
  }
}

function applyTransform(object: Object3D, transform: TransformTuple): void {
  object.position.set(transform[0], transform[1], transform[2]);
  object.rotation.set(transform[3], transform[4], transform[5]);
  object.scale.set(transform[6], transform[7], transform[8]);
}

export type PropsBuild = Readonly<{
  root: Group;
  animated: readonly Object3D[];
}>;

export function createProps(materials: WorldMaterials, placements: readonly PropPlacement[]): PropsBuild {
  const root = new Group();
  root.name = 'props:settlement';
  const prototypes = new Map(PROP_KINDS.map((kind) => [kind, createPrototype(kind, materials)]));
  const animated: Object3D[] = [];

  placements.forEach((prop) => {
    const instance = prototypes.get(prop.kind)?.clone(true);
    if (!instance) throw new Error(`Missing prop prototype for ${prop.kind}`);
    instance.name = `prop:${prop.kind}:${prop.id}`;
    instance.userData.placement = prop;
    applyTransform(instance, prop.transform);
    instance.traverse((object) => {
      if (object.userData.windKind) {
        object.userData.baseRotation = object.rotation.z;
        object.userData.windIndex = animated.length;
        animated.push(object);
      }
    });
    root.add(instance);
  });
  return Object.freeze({ root, animated: Object.freeze(animated) });
}

export function updateProps(build: PropsBuild, time: number): void {
  if (!Number.isFinite(time)) throw new RangeError('prop animation time must be finite');
  build.animated.forEach((object, index) => {
    const kind = String(object.userData.windKind);
    const amplitude = kind === 'ribbon' ? 0.14 : 0.07;
    object.rotation.z = Number(object.userData.baseRotation) + Math.sin(time * 0.91 + index * 1.73) * amplitude;
    if (kind === 'laundry') object.rotation.y = Math.sin(time * 1.37 + index) * 0.08;
  });
}
