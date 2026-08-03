import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

globalThis.document = {
  createElement() {
    return {
      width: 96,
      height: 96,
      getContext() {
        return {
          fillStyle: '', globalAlpha: 1, lineWidth: 1, strokeStyle: '',
          fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {},
        };
      },
    };
  },
};

const { createMaterials, createTerrain } = await import('../src/scene/terrain.js');
const { createVillage } = await import('../src/scene/architecture.js');
const { createCharacters } = await import('../src/scene/characters.js');
const { createEffects } = await import('../src/scene/effects.js');

test('constructed village geometry has finite vertex positions', () => {
  const materials = createMaterials(802);
  const terrain = createTerrain({ materials });
  const village = createVillage({ terrain, materials });
  const characters = createCharacters({ terrain, village });
  const effects = createEffects({ village, characters, materials });
  const root = new THREE.Group();
  root.add(terrain.group, village.group, characters.group, effects.group);
  const invalid = [];
  root.traverse((object) => {
    const attribute = object.geometry?.attributes?.position;
    if (!attribute) return;
    for (const value of attribute.array) {
      if (!Number.isFinite(value)) {
        invalid.push(object.geometry.type);
        break;
      }
    }
  });
  assert.deepEqual(invalid, []);
});

test('the central character and community figures expose readable face anchors', () => {
  const materials = createMaterials(803);
  const terrain = createTerrain({ materials });
  const village = createVillage({ terrain, materials });
  const characters = createCharacters({ terrain, village });
  assert.ok(characters.bilbo.userData.parts.eyeL);
  assert.ok(characters.bilbo.userData.parts.eyeR);
  assert.ok(characters.villagers.every((villager) => villager.userData.parts.eyeL && villager.userData.parts.eyeR));
});
