import {
  AdditiveBlending,
  BackSide,
  DoubleSide,
  FogExp2,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Scene,
  ShaderMaterial,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';
import {
  createAtmosphere,
  evaluateAtmosphere,
} from '../../src/effects/Atmosphere';
import {
  PARTICLE_KINDS,
  sampleParticleFrame,
} from '../../src/effects/Particles';
import {
  constellationState,
  createSubterraneanConstellation,
} from '../../src/effects/SubterraneanConstellation';
import { QUALITY_TIERS } from '../../src/render/quality';
import { createWorldAnchors } from '../../src/world/anchors';

describe('deterministic atmospheric state', () => {
  it('bounds atmosphere controls and evaluates only from snapshot and director state', () => {
    const snapshot = { time: 62, duration: 100 };
    const directorState = {
      fogDensity: 2,
      doorwayLight: -3,
      cutawayOpacity: 4,
      constellationIntensity: 0.8,
      shadowLength: 40,
    };

    const first = evaluateAtmosphere(snapshot, directorState);
    const second = evaluateAtmosphere(snapshot, directorState);

    expect(first).toEqual(second);
    expect(first.progress).toBeCloseTo(0.62);
    expect(first.fogDensity).toBeLessThanOrEqual(0.05);
    expect(first.doorwayLight).toBe(0);
    expect(first.cutawayOpacity).toBe(1);
    expect(first.constellationIntensity).toBeCloseTo(0.8);
    expect(first.shadowLength).toBeLessThanOrEqual(14);
    for (const kind of PARTICLE_KINDS) {
      expect(first.particleOpacity[kind]).toBeGreaterThanOrEqual(0);
      expect(first.particleOpacity[kind]).toBeLessThanOrEqual(1);
    }
  });

  it('samples dust, pollen, smoke, fireflies, and birds deterministically from seed and time', () => {
    for (const kind of PARTICLE_KINDS) {
      const first = sampleParticleFrame({ kind, seed: 111, count: 8, time: 18.75 });
      const second = sampleParticleFrame({ kind, seed: 111, count: 8, time: 18.75 });
      const later = sampleParticleFrame({ kind, seed: 111, count: 8, time: 31.5 });
      const otherSeed = sampleParticleFrame({ kind, seed: 112, count: 8, time: 18.75 });

      expect(first).toEqual(second);
      expect(first).not.toEqual(later);
      expect(first).not.toEqual(otherSeed);
      expect(first.positions).toHaveLength(8 * 3);
      expect(first.positions.every(Number.isFinite)).toBe(true);
      expect(first.opacities.every((value) => value >= 0 && value <= 1)).toBe(true);
    }
  });

  it('gates an unmistakable warning state to the climax and leaves an echo in resolution', () => {
    const before = evaluateAtmosphere({ time: 0, progress: 0.78 });
    const climax = evaluateAtmosphere({ time: 0, progress: 0.9 });
    const ending = evaluateAtmosphere({ time: 0, progress: 1 });

    expect(before.warningHaloOpacity).toBe(0);
    expect(before.skyVeilOpacity).toBe(0);
    expect(climax.warningHaloOpacity).toBeGreaterThan(0.55);
    expect(climax.warningHaloOpacity).toBeLessThanOrEqual(0.7);
    expect(climax.skyVeilOpacity).toBeGreaterThanOrEqual(0.18);
    expect(climax.skyVeilOpacity).toBeLessThanOrEqual(0.26);
    expect(climax.shadowLength).toBeGreaterThan(7);
    expect(ending.warningHaloOpacity).toBeGreaterThan(0.24);
    expect(ending.warningHaloOpacity).toBeLessThanOrEqual(0.28);
    expect(ending.warningHaloScale).toBeCloseTo(0.9);
    expect(ending.skyVeilOpacity).toBeGreaterThan(0.1);
    expect(ending.shadowLength).toBeGreaterThan(12);
  });

  it('hands halo emphasis to the doorway shadow after the measured warning beat', () => {
    const peak = evaluateAtmosphere({ time: 103, duration: 110.8 });
    const ending = evaluateAtmosphere({ time: 110.5, duration: 110.8 });

    expect(peak.warningHaloOpacity).toBeCloseTo(0.68);
    expect(peak.warningHaloScale).toBeCloseTo(1.04);
    expect(ending.warningHaloOpacity).toBeCloseTo(0.26, 2);
    expect(ending.warningHaloScale).toBeCloseTo(0.901, 2);
    expect(ending.warningHaloOpacity).toBeLessThan(peak.warningHaloOpacity * 0.4);
    expect(ending.skyVeilOpacity).toBeGreaterThan(0.14);
    expect(ending.shadowLength).toBeGreaterThan(13);
  });

  it('does not let a lagging director value erase an active warning shadow', () => {
    const climax = evaluateAtmosphere(
      { time: 100, duration: 110.8 },
      { constellationIntensity: 0, shadowLength: 0 },
    );

    expect(climax.warningHaloOpacity).toBeGreaterThan(0.55);
    expect(climax.warningHaloOpacity).toBeLessThanOrEqual(0.7);
    expect(climax.shadowLength).toBeGreaterThan(7);
  });
});

describe('subterranean constellation and ending shadow', () => {
  it('reveals the rumored light, then hides branches into a long final shadow', () => {
    const hidden = constellationState(0);
    const rumor = constellationState(0.62);
    const ending = constellationState(1);

    expect(hidden.opacity).toBe(0);
    expect(rumor.opacity).toBeGreaterThan(0.65);
    expect(rumor.cutawayOpacity).toBeGreaterThan(0.45);
    expect(ending.opacity).toBeLessThan(0.05);
    expect(ending.shadowLength).toBeGreaterThan(8);
    expect(ending.shadowOpacity).toBeGreaterThan(0.65);
    expect(ending.branchesVisible).toBe(false);
  });

  it('builds explicit cutaway, branching tubes, facets, and a ground-hugging shadow', () => {
    const effect = createSubterraneanConstellation({ seed: 111 });
    const branchGroup = effect.group.getObjectByName('effect:subterranean-branches');

    expect(branchGroup?.children.length).toBeGreaterThanOrEqual(6);
    expect(effect.facets).toBeInstanceOf(InstancedMesh);
    expect(effect.facets.count).toBeGreaterThanOrEqual(18);
    expect(effect.cutawayShell.material).toBeInstanceOf(ShaderMaterial);
    expect(effect.cutawayShell.renderOrder).toBeLessThan(effect.facets.renderOrder);
    expect(effect.shadow.rotation.x).toBeCloseTo(Math.PI / 2);

    effect.evaluate(1);
    expect(branchGroup?.visible).toBe(false);
    expect(effect.shadow.visible).toBe(true);
    expect(effect.shadow.scale.y).toBeGreaterThan(8);

    effect.dispose();
  });

  it('raises a beat-gated broken halo and projects the warning shadow toward camera', () => {
    const effect = createSubterraneanConstellation({ seed: 111 });
    const haloMeshes = effect.halo.children.filter(
      (child): child is Mesh => child instanceof Mesh,
    );
    const haloMaterial = haloMeshes[0].material as MeshBasicMaterial;
    const haloLight = effect.haloLight;

    expect(effect.halo.position.y).toBeGreaterThan(3);
    expect(effect.halo.position.z).toBeGreaterThan(2.4);
    expect(haloMeshes.length).toBeGreaterThanOrEqual(9);
    expect(haloMaterial.color.getHexString()).toBe('e8b65d');
    expect(haloMaterial.blending).toBe(AdditiveBlending);
    expect(haloMaterial.toneMapped).toBe(true);
    expect(haloLight).toBeInstanceOf(PointLight);
    expect(haloLight.castShadow).toBe(false);

    effect.evaluate(0.78);
    expect(effect.halo.visible).toBe(false);
    expect(effect.shadow.visible).toBe(false);
    expect(haloLight.intensity).toBe(0);

    effect.evaluate(0.9);
    expect(effect.halo.visible).toBe(true);
    expect(effect.halo.scale.x).toBeGreaterThan(1);
    expect(haloMaterial.opacity).toBeGreaterThan(0.35);
    expect(haloMaterial.opacity).toBeLessThanOrEqual(0.56);
    expect(haloLight.intensity).toBeGreaterThan(1);
    expect(haloLight.intensity).toBeLessThanOrEqual(2);
    expect(effect.shadow.visible).toBe(true);
    expect(effect.shadow.scale.x).toBeGreaterThan(3);
    expect(effect.shadow.position.z).toBeGreaterThan(effect.shadow.scale.y / 2);
    expect(effect.shadow.material).toBeInstanceOf(MeshBasicMaterial);
    expect(effect.shadow.material.side).toBe(DoubleSide);

    effect.evaluate(1);
    expect(effect.halo.visible).toBe(true);
    expect(effect.shadow.scale.y).toBeGreaterThan(12);

    effect.dispose();
  });

  it('settles the applied halo graphic while retaining its local gold echo', () => {
    const effect = createSubterraneanConstellation({ seed: 111 });
    const haloMaterial = effect.halo.children.find(
      (child): child is Mesh => child instanceof Mesh,
    )?.material as MeshBasicMaterial;

    effect.evaluate(103 / 110.8);
    const peak = {
      materialOpacity: haloMaterial.opacity,
      lightIntensity: effect.haloLight.intensity,
      scale: effect.halo.scale.x,
    };

    effect.evaluate(110.5 / 110.8);

    expect(peak.materialOpacity).toBeCloseTo(0.5304);
    expect(peak.lightIntensity).toBeCloseTo(1.598);
    expect(peak.scale).toBeCloseTo(1.04);
    expect(haloMaterial.opacity).toBeCloseTo(0.203, 2);
    expect(effect.haloLight.intensity).toBeCloseTo(0.612, 2);
    expect(effect.halo.scale.x).toBeCloseTo(0.901, 2);
    expect(effect.halo.visible).toBe(true);

    effect.dispose();
  });
});

describe('atmosphere scene objects', () => {
  it('provides warm sun, cool sky, doorway practicals, fog, contact shadows, and effects lifecycle', () => {
    const effects = createAtmosphere({
      quality: QUALITY_TIERS.high,
      particleSeed: 111,
    });

    expect(effects.fog).toBeInstanceOf(FogExp2);
    expect(effects.sun.color.getHexString()).toBe('ffd18a');
    expect(effects.sun.shadow.mapSize.width).toBe(2048);
    expect(effects.group.children.some((child) => child instanceof HemisphereLight)).toBe(true);
    expect(effects.doorwayLights).toHaveLength(2);
    expect(effects.doorwayLights.map((light) => light.position.toArray())).toEqual([
      [0, 1.8, 0.3],
      [-0.8, 1.35, 0.65],
    ]);
    expect(effects.contactShadows.length).toBeGreaterThanOrEqual(2);
    expect(effects.contactShadows[0].position.toArray()).toEqual([0, 0.018, 0]);
    expect(effects.subterranean.group.position.toArray()).toEqual([0, 0, 0]);
    expect(effects.particles.group.children.map((child) => child.renderOrder)).toEqual(
      [...effects.particles.group.children.map((child) => child.renderOrder)].sort((a, b) => a - b),
    );

    const state = effects.evaluate(
      { time: 100, duration: 100 },
      { doorwayLight: 0.9 },
    );
    expect(effects.fog.density).toBeCloseTo(state.fogDensity);
    expect(effects.doorwayLights[0].intensity).toBeGreaterThan(0);
    expect(effects.subterranean.shadow.visible).toBe(true);

    effects.dispose();
  });

  it('deepens fog and global lighting coherently into the climax', () => {
    const effects = createAtmosphere({ quality: QUALITY_TIERS.high });
    const opening = effects.evaluate({ time: 0, progress: 0 });
    const openingFogColor = effects.fog.color.clone();
    const openingSunIntensity = effects.sun.intensity;
    const openingSkyIntensity = effects.sky.intensity;

    const climax = effects.evaluate({ time: 0, progress: 0.9 });

    expect(climax.fogDensity).toBeGreaterThan(opening.fogDensity);
    expect(effects.fog.color.equals(openingFogColor)).toBe(false);
    expect(effects.fog.color.b).toBeGreaterThan(effects.fog.color.r);
    expect(effects.sun.intensity).toBeLessThan(openingSunIntensity);
    expect(effects.sky.intensity).toBeLessThan(openingSkyIntensity);
    expect(effects.sun.intensity).toBeGreaterThan(effects.sky.intensity);
    expect(climax.skyVeilOpacity).toBeGreaterThanOrEqual(0.18);

    effects.dispose();
  });

  it('places doorway and subterranean effects in the world anchor coordinate frame', () => {
    const anchors = createWorldAnchors(111);
    const effects = createAtmosphere({
      quality: QUALITY_TIERS.high,
      particleSeed: 111,
      anchors,
    });

    expect(effects.doorwayLights[0].position.toArray()).toEqual([...anchors.doorway]);
    expect(effects.doorwayLights[1].position.toArray()).toEqual([
      anchors.doorway[0] - 0.8,
      anchors.doorway[1] - 0.45,
      anchors.doorway[2] + 0.35,
    ]);
    expect(effects.contactShadows.map((shadow) => shadow.position.toArray())).toEqual([
      [anchors.warning[0], anchors.warning[1] + 0.018, anchors.warning[2]],
      [anchors.warning[0] - 5.2, anchors.warning[1] + 0.018, anchors.warning[2] + 4.8],
      [anchors.warning[0] + 5.8, anchors.warning[1] + 0.018, anchors.warning[2] - 3.6],
    ]);
    expect(effects.subterranean.group.position.toArray()).toEqual([...anchors.warning]);

    effects.evaluate({ time: 100, duration: 100 });
    effects.group.updateMatrixWorld(true);
    expect(effects.subterranean.cutawayShell.getWorldPosition(new Vector3()).toArray()).toEqual([
      ...anchors.warning,
    ]);
    const shadowOrigin = effects.subterranean.shadow.localToWorld(new Vector3(0, -0.5, 0));
    expect(shadowOrigin.x).toBeCloseTo(anchors.warning[0]);
    expect(shadowOrigin.y).toBeCloseTo(anchors.warning[1] + 0.025);
    expect(shadowOrigin.z).toBeCloseTo(anchors.warning[2] + 2.65);

    effects.dispose();
  });

  it('renders one persistent gradient sky and deepens it during warning', () => {
    const effects = createAtmosphere({ quality: QUALITY_TIERS.high });
    const material = effects.skyVeil.material as unknown as ShaderMaterial;

    expect(material).toBeInstanceOf(ShaderMaterial);
    expect(material.side).toBe(BackSide);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.toneMapped).toBe(true);
    expect(material.uniforms.upperColor.value.equals(
      material.uniforms.horizonColor.value,
    )).toBe(false);
    expect(effects.skyVeil.visible).toBe(true);

    effects.evaluate({ time: 0, progress: 0.78 });
    expect(effects.skyVeil.visible).toBe(true);
    expect(material.uniforms.warningVeil.value).toBe(0);

    const climax = effects.evaluate({ time: 0, progress: 0.9 });
    expect(effects.skyVeil.visible).toBe(true);
    expect(material.uniforms.duskMix.value).toBeGreaterThan(0.5);
    expect(material.uniforms.warningVeil.value).toBeCloseTo(
      climax.skyVeilOpacity,
    );

    const ending = effects.evaluate({ time: 0, progress: 1 });
    expect(effects.skyVeil.visible).toBe(true);
    expect(material.uniforms.warningVeil.value).toBeCloseTo(
      ending.skyVeilOpacity,
    );
    expect(ending.skyVeilOpacity).toBeLessThan(climax.skyVeilOpacity);

    effects.dispose();
  });

  it('detaches its group from the scene when disposed', () => {
    const scene = new Scene();
    const effects = createAtmosphere({ quality: QUALITY_TIERS.low });
    scene.add(effects.group);

    effects.dispose();

    expect(effects.group.parent).toBeNull();
    expect(scene.children).not.toContain(effects.group);
  });
});
