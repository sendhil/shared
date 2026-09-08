import * as THREE from 'three';
import type { StoryState } from '../narrative/NarrativeDirector';
import type { WorldHandles } from './buildWorld';
import { HILL_HOUSE_FRONT } from './houseFront';
import { PALETTE, seeded } from './materials';
import { NIGHT_SKY_ACCENT } from './skyDesign';

type ParticleField = {
  points: THREE.Points;
  base: Float32Array;
  phase: Float32Array;
  material: THREE.PointsMaterial;
};

const createField = (count: number, seed: number, color: THREE.ColorRepresentation, size: number): ParticleField => {
  const random = seeded(seed);
  const positions = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    base[offset] = (random() - 0.5) * 54;
    base[offset + 1] = random() * 9 + 0.25;
    base[offset + 2] = (random() - 0.5) * 44;
    positions[offset] = base[offset];
    positions[offset + 1] = base[offset + 1];
    positions[offset + 2] = base[offset + 2];
    phase[index] = random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false });
  return { points: new THREE.Points(geometry, material), base, phase, material };
};

export class EnvironmentEffects {
  private readonly dust = createField(260, 82, '#f4dfad', 0.12);
  private readonly leaves = createField(220, 146, '#d89055', 0.34);
  private readonly snow = createField(240, 81, '#f2fbff', 0.24);
  private readonly fireflies = createField(95, 332, '#ffe888', 0.11);
  private readonly rumors = createField(48, 719, '#ead7b1', 0.19);
  private readonly scene: THREE.Scene;
  private readonly background = new THREE.Color('#a6c9d9');
  private readonly fogColor = new THREE.Color('#b7cbd2');

  constructor(scene: THREE.Scene, private readonly world: WorldHandles) {
    this.scene = scene;
    scene.add(this.dust.points, this.leaves.points, this.snow.points, this.fireflies.points, this.rumors.points);
    scene.fog = new THREE.Fog(this.fogColor, 22, 76);
    scene.background = this.background;
  }

  update(state: StoryState, time: number): void {
    this.animateField(this.dust, time, 0.2, 0.03, 0.38 + state.night * 0.12, 0.1);
    this.animateField(this.leaves, time, 1.28, 0.38, state.season * (1 - state.night) * 0.98, 1.3);
    this.animateField(this.snow, time, 0.72, -0.55, state.season * state.mystery * 0.82, 0.7);
    this.animateFireflies(time, state.night);
    this.animateRumors(time, state.unease);

    const day = 1 - state.night;
    this.background.lerpColors(new THREE.Color('#0d2833'), new THREE.Color('#a6c9d9'), day);
    this.fogColor.lerpColors(new THREE.Color('#466372'), new THREE.Color(PALETTE.fogSilver), day);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(this.fogColor);
    fog.near = 15 - state.night * 4;
    fog.far = 76 - state.unease * 27;

    this.world.sun.intensity = 0.46 + day * 2.92;
    this.world.sun.color.lerpColors(new THREE.Color('#9ab6d0'), new THREE.Color('#ffe5ae'), day);
    this.world.sun.position.set(-18 + time * 0.35, 7 + day * 23, 13 - state.night * 18);
    this.world.hemi.intensity = 1.12 + day * 1.08;
    this.world.hemi.color.lerpColors(new THREE.Color('#50677f'), new THREE.Color('#a8cfdf'), day);
    this.world.hemi.groundColor.lerpColors(new THREE.Color('#142d2b'), new THREE.Color('#25422e'), day);
    const lanternStrength = 0.56 + state.night * 1.55 + state.mystery * 0.26;
    this.world.lanterns.forEach((light, index) => { light.intensity = lanternStrength * (0.82 + Math.sin(time * 2.3 + index) * 0.1); });
    this.world.gardenLights.forEach((light) => { light.intensity = lanternStrength; });
    this.world.windows.forEach((window) => { window.emissiveIntensity = 0.25 + state.night * 1.55 + state.mystery * 0.24; });
    this.world.door.emissiveIntensity = 0.12 + state.night * HILL_HOUSE_FRONT.nightDoorEmissive + state.mystery * 0.14;
    this.world.treasure.emissiveIntensity = 0.2 + state.mystery * 1.48 + state.unease * 0.5;
    this.world.treasureLight.intensity = 0.16 + state.mystery * 1.3 + state.unease * 0.36;
    const moonMaterial = this.world.moon.material as THREE.MeshBasicMaterial;
    const haloMaterial = this.world.moonHalo.material as THREE.MeshBasicMaterial;
    moonMaterial.opacity = state.night * NIGHT_SKY_ACCENT.finalOpacity;
    haloMaterial.opacity = state.night * 0.12;
    this.world.moon.rotation.y = time * 0.02;
    this.world.moonHalo.rotation.y = -time * 0.012;
  }

  dispose(): void {
    this.dust.points.removeFromParent();
    this.leaves.points.removeFromParent();
    this.snow.points.removeFromParent();
    this.fireflies.points.removeFromParent();
    this.rumors.points.removeFromParent();
  }

  private animateField(field: ParticleField, time: number, horizontalSpeed: number, verticalSpeed: number, opacity: number, sway: number): void {
    const position = field.points.geometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < field.phase.length; index += 1) {
      const offset = index * 3;
      const phase = field.phase[index];
      position.setXYZ(
        index,
        field.base[offset] + Math.sin(time * (0.72 + sway) + phase) * (0.8 + sway * 2) + time * horizontalSpeed,
        ((field.base[offset + 1] + time * verticalSpeed + 12) % 12) + 0.2,
        field.base[offset + 2] + Math.cos(time * 0.43 + phase) * (0.7 + sway),
      );
    }
    position.needsUpdate = true;
    field.material.opacity = opacity;
  }

  private animateFireflies(time: number, night: number): void {
    const field = this.fireflies;
    const position = field.points.geometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < field.phase.length; index += 1) {
      const offset = index * 3;
      const phase = field.phase[index];
      position.setXYZ(index,
        field.base[offset] * 0.42 + Math.sin(time * 1.4 + phase) * 1.2,
        0.9 + (field.base[offset + 1] % 4) + Math.sin(time * 2 + phase) * 0.3,
        2 + field.base[offset + 2] * 0.3 + Math.cos(time * 1.1 + phase) * 1.1,
      );
    }
    position.needsUpdate = true;
    field.material.opacity = night * (0.53 + 0.34 * Math.sin(time * 2.5) ** 2);
  }

  private animateRumors(time: number, unease: number): void {
    const field = this.rumors;
    const anchor = this.world.rumorAnchor.getWorldPosition(new THREE.Vector3());
    const position = field.points.geometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < field.phase.length; index += 1) {
      const phase = field.phase[index];
      const radius = 0.6 + (index % 6) * 0.12;
      position.setXYZ(index,
        anchor.x + Math.cos(time * 0.85 + phase) * radius,
        anchor.y + 0.45 + (index % 5) * 0.22 + Math.sin(time * 1.3 + phase) * 0.18,
        anchor.z + Math.sin(time * 0.85 + phase) * radius,
      );
    }
    position.needsUpdate = true;
    field.material.opacity = Math.max(0, (unease - 0.34) * 0.9);
  }
}
