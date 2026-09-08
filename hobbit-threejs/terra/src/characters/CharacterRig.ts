import * as THREE from 'three';
import { seeded, shadow, stylizedMaterial, variedColor } from '../world/materials';

export type VillagerRole = 'host' | 'carry' | 'greet' | 'arrange' | 'whisper' | 'watch';

export type Villager = {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  role: VillagerRole;
  phase: number;
  height: number;
  base: THREE.Vector3;
};

export type CharacterMood = {
  celebration: number;
  mystery: number;
  unease: number;
};

const skinColors = ['#f1bd94', '#d99670', '#a7624d', '#77422f'];
const clothes = ['#c76f48', '#406f6a', '#d6a955', '#846596', '#4d7f50', '#b65f54'];

const limb = (length: number, radius: number, material: THREE.Material): THREE.Group => {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, length, 6), material);
  mesh.position.y = -length / 2;
  pivot.add(mesh);
  return pivot;
};

export function createVillager(seed: number, role: VillagerRole, scale = 1): Villager {
  const random = seeded(seed);
  const height = scale * (0.86 + random() * 0.28);
  const root = new THREE.Group();
  const torso = new THREE.Group();
  root.add(torso);

  const coat = stylizedMaterial(variedColor(clothes[Math.floor(random() * clothes.length)], 0.15, random));
  const skin = stylizedMaterial(skinColors[Math.floor(random() * skinColors.length)]);
  const hair = stylizedMaterial(random() > 0.5 ? '#3a251f' : '#cab17a');
  const trouser = stylizedMaterial('#3c423a');

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.33 * height, 0.42 * height, 0.92 * height, 7), coat);
  body.position.y = 1.16 * height;
  torso.add(body);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.32 * height, 0.045 * height, 6, 12), stylizedMaterial('#e4c78a'));
  scarf.position.y = 1.54 * height;
  scarf.rotation.x = Math.PI / 2;
  torso.add(scarf);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 * height, 2), skin);
  head.position.y = 1.9 * height;
  torso.add(head);

  const eyeMaterial = stylizedMaterial('#1b2522', { roughness: 0.5 });
  for (const x of [-0.115, 0.115]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.041 * height, 7, 6), eyeMaterial);
    eye.position.set(x * height, 1.94 * height, 0.307 * height);
    torso.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.052 * height, 0.12 * height, 5), skin);
  nose.position.set(0, 1.86 * height, 0.34 * height);
  nose.rotation.x = Math.PI / 2;
  torso.add(nose);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.35 * height, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
  hairCap.position.copy(head.position).add(new THREE.Vector3(0, 0.08 * height, 0));
  torso.add(hairCap);

  if (role === 'host') {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3 * height, 0.42 * height, 7), stylizedMaterial('#5f6f9a'));
    hat.position.set(0, 2.28 * height, 0);
    hat.rotation.z = -0.12;
    torso.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.39 * height, 0.39 * height, 0.045 * height, 12), stylizedMaterial('#4c5078'));
    brim.position.y = 2.1 * height;
    torso.add(brim);
  }

  const leftArm = limb(0.78 * height, 0.11 * height, coat);
  const rightArm = limb(0.78 * height, 0.11 * height, coat);
  leftArm.position.set(-0.38 * height, 1.5 * height, 0);
  rightArm.position.set(0.38 * height, 1.5 * height, 0);
  torso.add(leftArm, rightArm);

  const leftLeg = limb(0.8 * height, 0.13 * height, trouser);
  const rightLeg = limb(0.8 * height, 0.13 * height, trouser);
  leftLeg.position.set(-0.17 * height, 0.8 * height, 0);
  rightLeg.position.set(0.17 * height, 0.8 * height, 0);
  torso.add(leftLeg, rightLeg);

  const footMaterial = stylizedMaterial('#302c2a');
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.15 * height, 7, 5), footMaterial);
    foot.scale.set(1, 0.65, 1.5);
    foot.position.set(side * 0.17 * height, 0.02 * height, 0.11 * height);
    torso.add(foot);
  }

  shadow(root);
  return { root, torso, head, leftArm, rightArm, leftLeg, rightLeg, role, phase: random() * Math.PI * 2, height, base: new THREE.Vector3() };
}

export function updateVillager(villager: Villager, time: number, mood: CharacterMood): void {
  const t = time * (1.25 + villager.phase * 0.04) + villager.phase;
  const walk = Math.sin(t) * 0.34;
  const cheer = mood.celebration * (0.25 + 0.25 * Math.sin(time * 0.7 + villager.phase));
  const tension = mood.unease;

  villager.root.position.y = villager.base.y + Math.abs(Math.sin(t)) * 0.028 * villager.height;
  villager.torso.rotation.z = Math.sin(t * 0.7) * 0.035;
  villager.head.rotation.y = Math.sin(time * 0.55 + villager.phase) * (0.14 + tension * 0.22);
  villager.leftLeg.rotation.x = walk * (villager.role === 'carry' ? 0.45 : 1);
  villager.rightLeg.rotation.x = -walk * (villager.role === 'carry' ? 0.45 : 1);

  if (villager.role === 'greet') {
    villager.rightArm.rotation.x = -1.4 - cheer * 0.9;
    villager.rightArm.rotation.z = 0.2 + Math.sin(time * 3 + villager.phase) * 0.25;
    villager.leftArm.rotation.x = 0.35;
  } else if (villager.role === 'carry') {
    villager.leftArm.rotation.x = -1.1;
    villager.rightArm.rotation.x = -1.1;
    villager.leftArm.rotation.z = 0.38;
    villager.rightArm.rotation.z = -0.38;
  } else if (villager.role === 'arrange' || villager.role === 'host') {
    villager.leftArm.rotation.x = -0.65 + Math.sin(time * 1.8 + villager.phase) * 0.22;
    villager.rightArm.rotation.x = -0.75 - Math.sin(time * 1.8 + villager.phase) * 0.18;
    villager.leftArm.rotation.z = 0.3;
    villager.rightArm.rotation.z = -0.3;
  } else if (villager.role === 'whisper') {
    villager.leftArm.rotation.x = -0.92 - tension * 0.2;
    villager.rightArm.rotation.x = -0.45;
    villager.torso.rotation.z = 0.16;
  } else {
    villager.leftArm.rotation.x = 0.22 + cheer * 0.8;
    villager.rightArm.rotation.x = -0.2 - cheer * 0.45;
  }

  villager.root.rotation.y = tension > 0.65 && villager.role !== 'host'
    ? villager.root.rotation.y + Math.sin(time * 0.55 + villager.phase) * 0.002
    : villager.root.rotation.y;
}
