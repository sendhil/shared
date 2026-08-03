import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { PALETTE } from '../world/palette';
import type { JointName, Pose } from './poses';
import { JOINT_NAMES, POSES } from './poses';
import type { PropKind, ResidentSpec } from './residents';

export type CharacterJoints = Readonly<Record<JointName, Group>>;

export type CharacterRig = Readonly<{
  root: Group;
  joints: CharacterJoints;
  propRoot: Group;
  applyPose(pose: Pose): void;
  gazeAt(target: readonly [number, number, number]): void;
  dispose(): void;
}>;

type CharacterMaterials = Readonly<{
  skin: MeshStandardMaterial;
  tunic: MeshStandardMaterial;
  trousers: MeshStandardMaterial;
  accent: MeshStandardMaterial;
  hair: MeshStandardMaterial;
  eye: MeshStandardMaterial;
  pupil: MeshStandardMaterial;
  leather: MeshStandardMaterial;
  paper: MeshStandardMaterial;
  wood: MeshStandardMaterial;
}>;

function characterMaterials(spec: ResidentSpec): CharacterMaterials {
  const material = (name: string, color: string, roughness: number) => {
    const value = new MeshStandardMaterial({ color, roughness });
    value.name = `cast-material:${spec.id}:${name}`;
    return value;
  };
  return Object.freeze({
    skin: material('skin', spec.clothing.skin, 0.78),
    tunic: material('tunic', spec.clothing.tunic, 0.88),
    trousers: material('trousers', spec.clothing.trousers, 0.91),
    accent: material('accent', spec.clothing.accent, 0.74),
    hair: material('hair', spec.hair.color, 0.94),
    eye: material('eye', PALETTE.hearthParchment, 0.66),
    pupil: material('pupil', PALETTE.mossShadow, 0.5),
    leather: material('leather', '#5D3E2B', 0.89),
    paper: material('paper', '#F8E7BE', 0.82),
    wood: material('wood', '#725036', 0.9),
  });
}

function mesh(
  name: string,
  geometry: BoxGeometry | CapsuleGeometry | ConeGeometry | CylinderGeometry | DodecahedronGeometry | IcosahedronGeometry | SphereGeometry | TorusGeometry,
  material: MeshStandardMaterial,
): Mesh {
  const result = new Mesh(geometry, material);
  result.name = name;
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function taperedLimb(name: string, length: number, upperRadius: number, lowerRadius: number, material: MeshStandardMaterial): Mesh {
  const limb = mesh(name, new CylinderGeometry(lowerRadius, upperRadius, length, 9, 2), material);
  limb.position.y = -length / 2;
  return limb;
}

function createJoint(name: JointName): Group {
  const joint = new Group();
  joint.name = `joint:${name}`;
  return joint;
}

function addHair(head: Group, spec: ResidentSpec, materials: CharacterMaterials): void {
  const radius = spec.proportions.headRadius;
  const crown = mesh('hair:crown', new SphereGeometry(radius * 1.02, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), materials.hair);
  crown.position.y = radius * 0.12;
  head.add(crown);

  if (spec.hair.style === 'curls') {
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      const curl = mesh(`hair:curl:${index}`, new DodecahedronGeometry(radius * 0.22, 0), materials.hair);
      curl.position.set(Math.cos(angle) * radius * 0.82, radius * (0.18 + (index % 2) * 0.18), Math.sin(angle) * radius * 0.82);
      head.add(curl);
    }
  } else if (spec.hair.style === 'braid') {
    for (let index = 0; index < 4; index += 1) {
      const braid = mesh(`hair:braid:${index}`, new DodecahedronGeometry(radius * (0.18 - index * 0.018), 0), materials.hair);
      braid.position.set(-radius * 0.78, -radius * (0.12 + index * 0.32), -radius * 0.15);
      head.add(braid);
    }
  } else if (spec.hair.style === 'bun') {
    const bun = mesh('hair:bun', new DodecahedronGeometry(radius * 0.38, 1), materials.hair);
    bun.position.set(0, radius * 0.66, -radius * 0.6);
    head.add(bun);
  } else if (spec.hair.style === 'cap' || spec.hair.style === 'kerchief') {
    const cap = mesh(`accessory:${spec.hair.style}`, new SphereGeometry(radius * 1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.48), spec.hair.style === 'cap' ? materials.accent : materials.tunic);
    cap.position.y = radius * 0.24;
    if (spec.hair.style === 'kerchief') {
      const tail = mesh('accessory:kerchief-tail', new ConeGeometry(radius * 0.16, radius * 0.55, 6), materials.tunic);
      tail.position.set(0, radius * 0.12, -radius * 0.95);
      tail.rotation.x = -0.48;
      cap.add(tail);
    }
    head.add(cap);
  } else if (spec.hair.style === 'straw-hat' || spec.hair.style === 'wide-hat') {
    const brimRadius = radius * (spec.hair.style === 'wide-hat' ? 1.48 : 1.3);
    const brim = mesh(`accessory:${spec.hair.style}-brim`, new CylinderGeometry(brimRadius, brimRadius, radius * 0.09, 18), materials.accent);
    brim.position.y = radius * 0.73;
    const crownHat = mesh(`accessory:${spec.hair.style}-crown`, new CylinderGeometry(radius * 0.62, radius * 0.7, radius * 0.58, 14), materials.accent);
    crownHat.position.y = radius * 0.98;
    head.add(brim, crownHat);
  }
}

function addTorsoAccessory(torso: Group, spec: ResidentSpec, materials: CharacterMaterials): void {
  const { shoulderWidth, torsoLength, torsoDepth } = spec.proportions;
  if (spec.accessory === 'apron' || spec.accessory === 'flour-kerchief') {
    const apron = mesh('accessory:apron', new BoxGeometry(shoulderWidth * 0.67, torsoLength * 0.72, 0.035), materials.paper);
    apron.position.set(0, torsoLength * 0.46, torsoDepth * 0.53);
    apron.rotation.z = spec.dominantHand === 'left' ? 0.025 : -0.025;
    torso.add(apron);
    if (spec.accessory === 'flour-kerchief') {
      const scarf = mesh('accessory:flour-scarf', new TorusGeometry(shoulderWidth * 0.28, 0.035, 6, 18, Math.PI * 1.55), materials.paper);
      scarf.position.set(0, torsoLength * 0.86, torsoDepth * 0.55);
      scarf.rotation.z = Math.PI * 0.72;
      torso.add(scarf);
    }
  } else if (spec.accessory === 'gold-waistcoat') {
    for (const side of [-1, 1]) {
      const panel = mesh(`accessory:waistcoat:${side}`, new BoxGeometry(shoulderWidth * 0.3, torsoLength * 0.7, 0.04), materials.accent);
      panel.position.set(side * shoulderWidth * 0.17, torsoLength * 0.49, torsoDepth * 0.53);
      panel.rotation.z = side * -0.045;
      torso.add(panel);
    }
  } else if (spec.accessory === 'tool-belt') {
    const belt = mesh('accessory:tool-belt', new TorusGeometry(shoulderWidth * 0.37, 0.035, 6, 18), materials.leather);
    belt.rotation.x = Math.PI / 2;
    belt.scale.z = torsoDepth / shoulderWidth;
    belt.position.y = torsoLength * 0.16;
    const pouch = mesh('accessory:tool-pouch', new BoxGeometry(shoulderWidth * 0.24, torsoLength * 0.24, torsoDepth * 0.28), materials.leather);
    pouch.position.set(spec.dominantHand === 'left' ? shoulderWidth * 0.27 : -shoulderWidth * 0.27, torsoLength * 0.14, torsoDepth * 0.42);
    torso.add(belt, pouch);
  } else if (spec.accessory === 'braces') {
    for (const side of [-1, 1] as const) {
      const label = side < 0 ? 'left' : 'right';
      const brace = mesh(`accessory:brace:${label}`, new BoxGeometry(shoulderWidth * 0.09, torsoLength * 0.78, 0.035), materials.leather);
      brace.position.set(side * shoulderWidth * 0.2, torsoLength * 0.52, torsoDepth * 0.53);
      brace.rotation.z = side * -0.05;
      torso.add(brace);
    }
  } else if (spec.accessory === 'flower-sash') {
    const sash = mesh('accessory:flower-sash', new BoxGeometry(shoulderWidth * 0.13, torsoLength * 0.92, 0.045), materials.accent);
    sash.position.set(0, torsoLength * 0.54, torsoDepth * 0.53);
    sash.rotation.z = spec.dominantHand === 'left' ? -0.54 : 0.54;
    torso.add(sash);
    for (let index = 0; index < 2; index += 1) {
      const flower = mesh(`accessory:sash-flower:${index}`, new DodecahedronGeometry(shoulderWidth * 0.09, 0), index === 0 ? materials.accent : materials.paper);
      const side = spec.dominantHand === 'left' ? 1 : -1;
      flower.position.set(side * shoulderWidth * (0.18 - index * 0.07), torsoLength * (0.72 - index * 0.22), torsoDepth * 0.59);
      torso.add(flower);
    }
  } else if (spec.accessory === 'ribbon-bow') {
    for (const side of [-1, 1] as const) {
      const label = side < 0 ? 'left' : 'right';
      const loop = mesh(`accessory:ribbon-bow:${label}`, new DodecahedronGeometry(shoulderWidth * 0.13, 0), materials.accent);
      loop.scale.set(1.25, 0.7, 0.42);
      loop.position.set(side * shoulderWidth * 0.13, torsoLength * 0.72, torsoDepth * 0.57);
      loop.rotation.z = side * -0.38;
      torso.add(loop);
    }
    const knot = mesh('accessory:ribbon-bow:knot', new DodecahedronGeometry(shoulderWidth * 0.075, 0), materials.accent);
    knot.position.set(0, torsoLength * 0.72, torsoDepth * 0.6);
    torso.add(knot);
  } else if (spec.accessory === 'shawl') {
    const shawl = mesh('accessory:shawl', new ConeGeometry(shoulderWidth * 0.58, torsoLength * 0.44, 12, 1, true), materials.accent);
    shawl.position.set(0, torsoLength * 0.75, 0);
    shawl.scale.z = torsoDepth / shoulderWidth;
    torso.add(shawl);
  } else if (spec.accessory === 'walking-cloak') {
    const cloak = mesh('accessory:walking-cloak', new ConeGeometry(shoulderWidth * 0.58, torsoLength * 1.06, 12, 2, true, Math.PI * 0.15, Math.PI * 1.7), materials.accent);
    cloak.position.set(0, torsoLength * 0.52, -torsoDepth * 0.16);
    cloak.rotation.y = Math.PI * 0.42;
    cloak.scale.z = torsoDepth / shoulderWidth;
    torso.add(cloak);
  }
}

function addFaceAccessory(head: Group, spec: ResidentSpec, materials: CharacterMaterials): void {
  if (spec.accessory !== 'spectacles') return;
  const radius = spec.proportions.headRadius;
  for (const side of [-1, 1] as const) {
    const label = side < 0 ? 'left' : 'right';
    const lens = mesh(`accessory:spectacles:${label}`, new TorusGeometry(radius * 0.16, radius * 0.025, 5, 14), materials.leather);
    lens.position.set(side * radius * 0.27, radius * 0.1, radius * 1.02);
    head.add(lens);
  }
  const bridge = mesh('accessory:spectacles:bridge', new CylinderGeometry(radius * 0.018, radius * 0.018, radius * 0.19, 6), materials.leather);
  bridge.position.set(0, radius * 0.1, radius * 1.02);
  bridge.rotation.z = Math.PI / 2;
  head.add(bridge);
}

function torsoMesh(spec: ResidentSpec, materials: CharacterMaterials): Mesh {
  const { shoulderWidth, torsoLength, torsoDepth, hipWidth } = spec.proportions;
  if (spec.silhouette.body === 'tapered') {
    return mesh(
      'body:torso',
      new CylinderGeometry(shoulderWidth * 0.38, hipWidth * 0.4, torsoLength * 0.84, 10, 2),
      materials.tunic,
    );
  }
  if (spec.silhouette.body === 'sturdy') {
    const body = mesh('body:torso', new DodecahedronGeometry(1, 1), materials.tunic);
    body.scale.set(shoulderWidth * 0.38, torsoLength * 0.42, torsoDepth * 0.54);
    return body;
  }
  const body = mesh(
    'body:torso',
    new CapsuleGeometry(shoulderWidth * 0.36, torsoLength * 0.42, 5, 12),
    materials.tunic,
  );
  body.scale.z = torsoDepth / shoulderWidth;
  return body;
}

const FACE_SCALES = Object.freeze({
  round: Object.freeze([1, 1.04, 1] as const),
  long: Object.freeze([0.88, 1.17, 0.96] as const),
  broad: Object.freeze([1.1, 0.98, 0.97] as const),
});

function addSleeveLayer(
  upperArm: Group,
  label: 'left' | 'right',
  spec: ResidentSpec,
  materials: CharacterMaterials,
): void {
  const style = spec.silhouette.sleeve;
  if (style === 'plain') return;
  const { shoulderWidth, upperArmLength } = spec.proportions;
  if (style === 'rolled') {
    const cuff = mesh(
      `clothing:sleeve:${label}:rolled`,
      new TorusGeometry(shoulderWidth * 0.1, shoulderWidth * 0.025, 5, 12),
      materials.accent,
    );
    cuff.position.y = -upperArmLength * 0.78;
    cuff.rotation.x = Math.PI / 2;
    upperArm.add(cuff);
    return;
  }
  const puff = mesh(
    `clothing:sleeve:${label}:puffed`,
    new DodecahedronGeometry(shoulderWidth * 0.15, 0),
    materials.tunic,
  );
  puff.position.y = -upperArmLength * 0.12;
  puff.scale.set(1.05, 1.18, 0.94);
  upperArm.add(puff);
}

function createPropModel(kind: PropKind, materials: CharacterMaterials): Group {
  const prop = new Group();
  prop.name = `prop:${kind}`;

  if (kind === 'host-kit') {
    const invitation = mesh('prop:host-invitation', new BoxGeometry(0.48, 0.62, 0.025), materials.paper);
    invitation.position.set(0.36, 1.82, 0.56);
    invitation.userData.hostPhase = 'invitation';
    const seal = mesh('prop:invitation-seal', new CylinderGeometry(0.055, 0.055, 0.025, 10), materials.accent);
    seal.rotation.x = Math.PI / 2;
    seal.position.set(0.49, 1.65, 0.59);
    seal.userData.hostPhase = 'invitation';
    const crate = mesh('prop:host-crate', new BoxGeometry(0.86, 0.62, 0.58, 2, 2, 2), materials.wood);
    crate.position.set(0, 1.18, 0.52);
    crate.visible = false;
    crate.userData.hostPhase = 'crate';
    prop.add(invitation, seal, crate);
  } else if (kind === 'bakery-tray') {
    const tray = mesh('prop:bakery-tray', new BoxGeometry(0.9, 0.07, 0.58), materials.wood);
    tray.position.set(0, 1.3, 0.5);
    prop.add(tray);
    for (let index = 0; index < 5; index += 1) {
      const bun = mesh(`prop:bread-roll:${index}`, new DodecahedronGeometry(0.11, 1), materials.accent);
      bun.scale.set(1.3, 0.72, 1);
      bun.position.set(-0.3 + (index % 3) * 0.3, 1.39, 0.35 + Math.floor(index / 3) * 0.25);
      prop.add(bun);
    }
  } else if (kind === 'flower-basket') {
    const basket = mesh('prop:flower-basket', new CylinderGeometry(0.3, 0.23, 0.38, 12), materials.wood);
    basket.position.set(-0.34, 0.82, 0.42);
    prop.add(basket);
    for (let index = 0; index < 5; index += 1) {
      const flower = mesh(`prop:gathered-flower:${index}`, new DodecahedronGeometry(0.08, 0), index % 2 ? materials.accent : materials.tunic);
      flower.position.set(-0.5 + index * 0.08, 1.05 + (index % 2) * 0.08, 0.42 + Math.sin(index) * 0.12);
      prop.add(flower);
    }
  } else if (kind === 'ribbon') {
    const spool = mesh('prop:ribbon-spool', new TorusGeometry(0.18, 0.055, 7, 16), materials.wood);
    spool.position.set(-0.34, 1.05, 0.48);
    spool.rotation.y = Math.PI / 2;
    const ribbon = mesh('prop:streaming-ribbon', new BoxGeometry(0.07, 0.025, 1.55, 1, 1, 8), materials.accent);
    ribbon.position.set(0.28, 1.1, 0.85);
    ribbon.rotation.y = 0.38;
    prop.add(spool, ribbon);
  } else if (kind === 'hammer') {
    const handle = mesh('prop:hammer-handle', new CylinderGeometry(0.035, 0.045, 0.68, 7), materials.wood);
    handle.position.set(0.42, 1.58, 0.28);
    handle.rotation.z = 0.35;
    const head = mesh('prop:hammer-head', new BoxGeometry(0.38, 0.16, 0.17), materials.leather);
    head.position.set(0.31, 1.9, 0.28);
    prop.add(handle, head);
  } else if (kind === 'cart-grip') {
    for (const side of [-1, 1]) {
      const grip = mesh(`prop:cart-grip:${side}`, new CylinderGeometry(0.035, 0.035, 0.72, 7), materials.wood);
      grip.position.set(side * 0.3, 1.02, 0.62);
      grip.rotation.x = Math.PI / 2;
      prop.add(grip);
    }
  } else if (kind === 'gossip-cup') {
    const cup = mesh('prop:gossip-cup', new CylinderGeometry(0.13, 0.1, 0.24, 10), materials.accent);
    cup.position.set(0.36, 1.14, 0.46);
    const handle = mesh('prop:cup-handle', new TorusGeometry(0.1, 0.025, 6, 12, Math.PI * 1.5), materials.accent);
    handle.position.set(0.49, 1.17, 0.46);
    prop.add(cup, handle);
  } else {
    const stick = mesh('prop:walking-stick', new CylinderGeometry(0.025, 0.045, 1.65, 7), materials.wood);
    stick.position.set(0.4, 0.8, 0.2);
    stick.rotation.z = -0.1;
    const grip = mesh('prop:walking-stick-grip', new TorusGeometry(0.13, 0.035, 7, 14, Math.PI), materials.wood);
    grip.position.set(0.48, 1.62, 0.2);
    grip.rotation.z = Math.PI / 2;
    prop.add(stick, grip);
  }
  return prop;
}

export function createCharacterRig(spec: ResidentSpec): CharacterRig {
  const materials = characterMaterials(spec);
  const root = new Group();
  root.name = `character:${spec.id}`;
  root.userData.residentId = spec.id;
  root.userData.proportions = spec.proportions;
  root.userData.materialCount = Object.keys(materials).length;

  const mutableJoints = Object.fromEntries(JOINT_NAMES.map((joint) => [joint, createJoint(joint)])) as Record<JointName, Group>;
  const joints = Object.freeze(mutableJoints);
  const proportions = spec.proportions;
  const footHeight = 0.18;
  const hipHeight = footHeight + proportions.lowerLegLength + proportions.upperLegLength;

  joints.hips.position.y = hipHeight;
  root.add(joints.hips);
  const hipsBody = mesh('body:hips', new CapsuleGeometry(proportions.hipWidth * 0.33, proportions.hipWidth * 0.36, 4, 10), materials.trousers);
  hipsBody.rotation.z = Math.PI / 2;
  hipsBody.scale.z = proportions.torsoDepth / proportions.hipWidth;
  joints.hips.add(hipsBody);

  joints.torso.position.y = proportions.hipWidth * 0.14;
  joints.hips.add(joints.torso);
  const torsoBody = torsoMesh(spec, materials);
  torsoBody.position.y = proportions.torsoLength * 0.47;
  joints.torso.add(torsoBody);
  const tunicHem = mesh('clothing:tunic-hem', new CylinderGeometry(proportions.shoulderWidth * 0.4, proportions.hipWidth * 0.55, proportions.torsoLength * 0.22, 12), materials.tunic);
  tunicHem.position.y = proportions.torsoLength * 0.11;
  joints.torso.add(tunicHem);
  addTorsoAccessory(joints.torso, spec, materials);

  joints.neck.position.set(0, proportions.torsoLength, 0);
  joints.torso.add(joints.neck);
  const neckBody = mesh('body:neck', new CylinderGeometry(proportions.headRadius * 0.28, proportions.headRadius * 0.32, proportions.headRadius * 0.38, 10), materials.skin);
  neckBody.position.y = proportions.headRadius * 0.16;
  joints.neck.add(neckBody);
  joints.head.position.y = proportions.headRadius * 0.52;
  joints.neck.add(joints.head);
  const headBody = mesh('body:head', new SphereGeometry(proportions.headRadius, 16, 11), materials.skin);
  const faceScale = FACE_SCALES[spec.silhouette.face];
  headBody.scale.set(faceScale[0], faceScale[1], faceScale[2]);
  joints.head.add(headBody);

  const eyeY = proportions.headRadius * 0.1;
  const eyeZ = proportions.headRadius * 0.91;
  const pupils: Mesh[] = [];
  for (const side of [-1, 1] as const) {
    const label = side < 0 ? 'left' : 'right';
    const eye = mesh(`face:${label}-eye`, new SphereGeometry(proportions.headRadius * 0.105, 9, 6), materials.eye);
    eye.scale.y = 1.18;
    eye.position.set(side * proportions.headRadius * 0.32, eyeY, eyeZ);
    const pupil = mesh(`face:${label}-pupil`, new SphereGeometry(proportions.headRadius * 0.046, 8, 5), materials.pupil);
    pupil.position.set(side * proportions.headRadius * 0.32, eyeY, eyeZ + proportions.headRadius * 0.09);
    pupils.push(pupil);
    joints.head.add(eye, pupil);
  }
  const nose = spec.silhouette.nose === 'button'
    ? mesh('face:nose', new SphereGeometry(proportions.headRadius * 0.13, 9, 6), materials.skin)
    : spec.silhouette.nose === 'broad'
      ? mesh('face:nose', new DodecahedronGeometry(proportions.headRadius * 0.14, 0), materials.skin)
      : mesh('face:nose', new ConeGeometry(proportions.headRadius * 0.11, proportions.headRadius * 0.32, 8), materials.skin);
  if (spec.silhouette.nose === 'pointed') nose.rotation.x = Math.PI / 2;
  if (spec.silhouette.nose === 'button') nose.scale.set(1, 0.82, 0.86);
  if (spec.silhouette.nose === 'broad') nose.scale.set(1.18, 0.78, 0.88);
  nose.position.set(0, -proportions.headRadius * 0.08, proportions.headRadius * (0.94 + faceScale[2] * 0.1));
  joints.head.add(nose);
  const earScale = spec.silhouette.face === 'round'
    ? [0.48, 0.94, 0.74] as const
    : spec.silhouette.face === 'long'
      ? [0.38, 1.12, 0.66] as const
      : [0.55, 1.02, 0.78] as const;
  for (const side of [-1, 1] as const) {
    const ear = mesh(`face:${side < 0 ? 'left' : 'right'}-ear`, new SphereGeometry(proportions.headRadius * 0.13, 8, 5), materials.skin);
    ear.scale.set(earScale[0], earScale[1], earScale[2]);
    ear.position.set(side * proportions.headRadius * (0.9 + faceScale[0] * 0.08), 0, 0);
    joints.head.add(ear);
  }
  addHair(joints.head, spec, materials);
  addFaceAccessory(joints.head, spec, materials);

  for (const side of [-1, 1] as const) {
    const label = side < 0 ? 'left' : 'right';
    const upperArm = joints[`${label}UpperArm` as JointName];
    const lowerArm = joints[`${label}LowerArm` as JointName];
    const hand = joints[`${label}Hand` as JointName];
    upperArm.position.set(side * proportions.shoulderWidth * 0.53, proportions.torsoLength * 0.82, 0);
    joints.torso.add(upperArm);
    upperArm.add(taperedLimb(`body:${label}-upper-arm`, proportions.upperArmLength, proportions.shoulderWidth * 0.12, proportions.shoulderWidth * 0.095, materials.tunic));
    addSleeveLayer(upperArm, label, spec, materials);
    lowerArm.position.y = -proportions.upperArmLength;
    upperArm.add(lowerArm);
    lowerArm.add(taperedLimb(`body:${label}-lower-arm`, proportions.lowerArmLength, proportions.shoulderWidth * 0.092, proportions.shoulderWidth * 0.075, materials.skin));
    hand.position.y = -proportions.lowerArmLength;
    lowerArm.add(hand);
    const handBody = mesh(`body:${label}-hand`, new DodecahedronGeometry(proportions.handScale, 1), materials.skin);
    handBody.scale.set(0.72, 1.1, 0.55);
    handBody.position.y = -proportions.handScale * 0.55;
    hand.add(handBody);

    const upperLeg = joints[`${label}UpperLeg` as JointName];
    const lowerLeg = joints[`${label}LowerLeg` as JointName];
    const foot = joints[`${label}Foot` as JointName];
    upperLeg.position.set(side * proportions.hipWidth * 0.28, -proportions.hipWidth * 0.08, 0);
    joints.hips.add(upperLeg);
    upperLeg.add(taperedLimb(`body:${label}-upper-leg`, proportions.upperLegLength, proportions.hipWidth * 0.18, proportions.hipWidth * 0.14, materials.trousers));
    lowerLeg.position.y = -proportions.upperLegLength;
    upperLeg.add(lowerLeg);
    lowerLeg.add(taperedLimb(`body:${label}-lower-leg`, proportions.lowerLegLength, proportions.hipWidth * 0.135, proportions.hipWidth * 0.105, materials.trousers));
    foot.position.y = -proportions.lowerLegLength;
    lowerLeg.add(foot);
    const footBody = mesh(`body:${label}-foot`, new CapsuleGeometry(footHeight * 0.48, proportions.footLength * 0.44, 4, 9), materials.leather);
    footBody.rotation.x = Math.PI / 2;
    footBody.position.set(0, -footHeight * 0.02, proportions.footLength * 0.35);
    footBody.scale.x = 0.72;
    foot.add(footBody);
  }

  const propRoot = createPropModel(spec.prop, materials);
  root.add(propRoot);

  const applyPose = (pose: Pose): void => {
    for (const jointName of JOINT_NAMES) {
      const value = pose[jointName];
      joints[jointName].rotation.set(value[0], value[1], value[2]);
    }
  };

  const gazeAt = (target: readonly [number, number, number]): void => {
    if (!target.every(Number.isFinite)) throw new RangeError('gaze target must be finite');
    const delta = new Vector3(target[0] - root.position.x, target[1] - root.position.y - hipHeight - proportions.torsoLength, target[2] - root.position.z);
    const localYaw = Math.atan2(delta.x, delta.z) - root.rotation.y;
    const yaw = Math.max(-0.34, Math.min(0.34, Math.atan2(Math.sin(localYaw), Math.cos(localYaw))));
    const horizontal = Math.max(0.001, Math.hypot(delta.x, delta.z));
    const pitch = Math.max(-0.18, Math.min(0.18, -Math.atan2(delta.y, horizontal) * 0.25));
    joints.head.rotation.y += yaw * 0.56;
    joints.head.rotation.x += pitch;
    pupils.forEach((pupil, index) => {
      const side = index === 0 ? -1 : 1;
      pupil.position.x = side * proportions.headRadius * 0.32 + yaw * proportions.headRadius * 0.08;
      pupil.position.y = eyeY - pitch * proportions.headRadius * 0.08;
    });
    root.userData.gazeTarget = Object.freeze([...target]);
  };

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<{ dispose(): void }>();
    const ownedMaterials = new Set<Material>();
    root.traverse((object: Object3D) => {
      if (object instanceof Mesh) {
        geometries.add(object.geometry);
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        meshMaterials.forEach((value) => ownedMaterials.add(value));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    ownedMaterials.forEach((material) => material.dispose());
    root.removeFromParent();
    root.clear();
  };

  applyPose(POSES.idle);
  return Object.freeze({ root, joints, propRoot, applyPose, gazeAt, dispose });
}
