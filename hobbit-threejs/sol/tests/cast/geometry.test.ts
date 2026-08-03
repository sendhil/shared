import { Material, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { createCharacterRig } from '../../src/cast/CharacterRig';
import {
  createResidentSpecs,
  type AccessoryKind,
} from '../../src/cast/residents';

function collectMeshes(root: { traverse(callback: (object: unknown) => void): void }): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
  return meshes;
}

describe('resident geometry vocabulary', () => {
  it('authors immutable deterministic profiles with broad silhouette coverage', () => {
    const residents = createResidentSpecs(111);
    const repeated = createResidentSpecs(111);
    const profiles = residents.map((resident) => resident.silhouette);

    expect(profiles.every(Boolean)).toBe(true);
    expect(profiles.every(Object.isFrozen)).toBe(true);
    expect(profiles).toEqual(repeated.map((resident) => resident.silhouette));
    expect(new Set(profiles.map((profile) => profile.body))).toEqual(
      new Set(['round', 'tapered', 'sturdy']),
    );
    expect(new Set(profiles.map((profile) => profile.face))).toEqual(
      new Set(['round', 'long', 'broad']),
    );
    expect(new Set(profiles.map((profile) => profile.nose))).toEqual(
      new Set(['button', 'pointed', 'broad']),
    );
    expect(new Set(profiles.map((profile) => profile.sleeve))).toEqual(
      new Set(['plain', 'rolled', 'puffed']),
    );
    expect(new Set(profiles.map((profile) => JSON.stringify(profile))).size)
      .toBeGreaterThanOrEqual(9);
  });

  it('realizes body, face, nose, ear, and sleeve profiles as readable geometry', () => {
    const residents = createResidentSpecs(111);
    const rigs = residents.map(createCharacterRig);
    const torsoTypes = new Set<string>();
    const headScales = new Set<string>();
    const noseTypes = new Set<string>();
    const earScales = new Set<string>();

    for (const [index, rig] of rigs.entries()) {
      const resident = residents[index];
      const torso = rig.root.getObjectByName('body:torso') as Mesh;
      const head = rig.root.getObjectByName('body:head') as Mesh;
      const nose = rig.root.getObjectByName('face:nose') as Mesh;
      const ear = rig.root.getObjectByName('face:left-ear') as Mesh;
      const sleeves = collectMeshes(rig.root).filter((mesh) => mesh.name.startsWith('clothing:sleeve:'));
      torsoTypes.add(torso.geometry.type);
      headScales.add(head.scale.toArray().map((value) => value.toFixed(3)).join('/'));
      noseTypes.add(nose.geometry.type);
      earScales.add(ear.scale.toArray().map((value) => value.toFixed(3)).join('/'));

      if (resident.silhouette.sleeve === 'plain') {
        expect(sleeves).toHaveLength(0);
      } else {
        expect(sleeves).toHaveLength(2);
        expect(sleeves.every((sleeve) => sleeve.name.endsWith(resident.silhouette.sleeve))).toBe(true);
      }
    }

    expect(torsoTypes).toEqual(new Set(['CapsuleGeometry', 'CylinderGeometry', 'DodecahedronGeometry']));
    expect(headScales.size).toBeGreaterThanOrEqual(3);
    expect(noseTypes).toEqual(new Set(['SphereGeometry', 'ConeGeometry', 'DodecahedronGeometry']));
    expect(earScales.size).toBeGreaterThanOrEqual(3);
    rigs.forEach((rig) => rig.dispose());
  });

  it('gives each existing accessory role its own structural silhouette', () => {
    const requiredMarkers: Readonly<Record<AccessoryKind, readonly string[]>> = {
      'gold-waistcoat': ['accessory:waistcoat:-1', 'accessory:waistcoat:1'],
      apron: ['accessory:apron'],
      'flour-kerchief': ['accessory:apron', 'accessory:flour-scarf'],
      'flower-sash': ['accessory:flower-sash', 'accessory:sash-flower:0'],
      'ribbon-bow': ['accessory:ribbon-bow:left', 'accessory:ribbon-bow:right', 'accessory:ribbon-bow:knot'],
      'tool-belt': ['accessory:tool-belt', 'accessory:tool-pouch'],
      braces: ['accessory:brace:left', 'accessory:brace:right'],
      shawl: ['accessory:shawl'],
      spectacles: ['accessory:spectacles:left', 'accessory:spectacles:right', 'accessory:spectacles:bridge'],
      'walking-cloak': ['accessory:walking-cloak'],
    };
    const residents = createResidentSpecs(111);
    const rigs = residents.map(createCharacterRig);

    for (const [index, rig] of rigs.entries()) {
      const resident = residents[index];
      for (const marker of requiredMarkers[resident.accessory]) {
        expect(rig.root.getObjectByName(marker), `${resident.id} is missing ${marker}`).toBeTruthy();
      }
      if (resident.hair.style === 'cap') {
        expect(rig.root.getObjectByName('accessory:kerchief-tail')).toBeUndefined();
      }
    }

    rigs.forEach((rig) => rig.dispose());
  });

  it('stays within the fixed material and geometry budgets', () => {
    const rigs = createResidentSpecs(111).map(createCharacterRig);
    let totalMeshes = 0;
    for (const rig of rigs) {
      const meshes = collectMeshes(rig.root);
      const materials = new Set<Material>();
      for (const mesh of meshes) {
        const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        meshMaterials.forEach((material) => materials.add(material));
        expect(Array.from(mesh.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);
      }
      expect(rig.root.userData.materialCount).toBe(10);
      expect(materials.size).toBeLessThanOrEqual(10);
      expect(meshes.length).toBeLessThanOrEqual(43);
      totalMeshes += meshes.length;
    }

    expect(totalMeshes).toBeGreaterThan(437);
    expect(totalMeshes).toBeLessThanOrEqual(480);
    rigs.forEach((rig) => rig.dispose());
  });
});
