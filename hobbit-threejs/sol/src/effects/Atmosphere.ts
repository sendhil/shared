import {
  BackSide,
  CircleGeometry,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import type { QualitySettings } from '../render/quality';
import type { WorldAnchors } from '../world/anchors';
import {
  createParticleSystem,
  type ParticleOpacities,
  type ParticleSystem,
} from './Particles';
import {
  constellationState,
  createSubterraneanConstellation,
  type ConstellationState,
  type SubterraneanConstellation,
} from './SubterraneanConstellation';

export type EffectsSnapshot = Readonly<{
  time: number;
  duration?: number;
  progress?: number;
}>;

export type EffectsDirectorState = Readonly<{
  fogDensity?: number;
  doorwayLight?: number;
  cutawayOpacity?: number;
  constellationIntensity?: number;
  shadowLength?: number;
}>;

export type AtmosphereState = Readonly<{
  progress: number;
  fogDensity: number;
  doorwayLight: number;
  cutawayOpacity: number;
  constellationIntensity: number;
  warningHaloOpacity: number;
  warningHaloScale: number;
  skyVeilOpacity: number;
  shadowLength: number;
  particleOpacity: ParticleOpacities;
}>;

function clamp(value: number, min: number, max: number): number {
  const safe = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, safe));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function smootherstep(value: number): number {
  const progress = clamp01(value);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function resolveProgress(snapshot: EffectsSnapshot): number {
  if (snapshot.progress !== undefined && Number.isFinite(snapshot.progress)) {
    return clamp01(snapshot.progress);
  }
  const duration = snapshot.duration ?? 0;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return clamp01(snapshot.time / duration);
}

function finiteOverride(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

export function evaluateAtmosphere(
  snapshot: EffectsSnapshot,
  directorState: EffectsDirectorState = {},
): AtmosphereState {
  const progress = resolveProgress(snapshot);
  const motif = constellationState(progress);
  const dusk = smootherstep((progress - 0.68) / 0.32);
  const earlyAir = 1 - smootherstep((progress - 0.58) / 0.3);
  const warning = smootherstep((progress - 0.76) / 0.22);

  const particleOpacity = Object.freeze({
    dust: clamp01(0.3 + dusk * 0.2),
    pollen: clamp01(0.58 * earlyAir),
    smoke: clamp01(0.42 - dusk * 0.14),
    firefly: clamp01(0.08 + dusk * 0.72),
    bird: clamp01(0.46 * earlyAir),
  });

  return Object.freeze({
    progress,
    fogDensity: clamp(
      finiteOverride(directorState.fogDensity, 0.0065 + dusk * 0.0115),
      0.002,
      0.05,
    ),
    doorwayLight: clamp01(
      finiteOverride(directorState.doorwayLight, 0.28 + warning * 0.72),
    ),
    cutawayOpacity: clamp01(
      finiteOverride(directorState.cutawayOpacity, motif.cutawayOpacity),
    ),
    constellationIntensity: clamp01(
      finiteOverride(directorState.constellationIntensity, motif.opacity),
    ),
    warningHaloOpacity: motif.haloOpacity,
    warningHaloScale: motif.haloScale,
    skyVeilOpacity: motif.skyVeilOpacity,
    shadowLength: clamp(
      Math.max(
        motif.shadowLength,
        finiteOverride(directorState.shadowLength, motif.shadowLength),
      ),
      0,
      14,
    ),
    particleOpacity,
  });
}

export type ContactShadow = Mesh<CircleGeometry, MeshBasicMaterial>;

export type Atmosphere = Readonly<{
  group: Group;
  fog: FogExp2;
  sun: DirectionalLight;
  sky: HemisphereLight;
  skyVeil: Mesh<SphereGeometry, ShaderMaterial>;
  doorwayLights: readonly PointLight[];
  contactShadows: readonly ContactShadow[];
  particles: ParticleSystem;
  subterranean: SubterraneanConstellation;
  evaluate(snapshot: EffectsSnapshot, directorState?: EffectsDirectorState): AtmosphereState;
  dispose(): void;
}>;

export type CreateAtmosphereOptions = Readonly<{
  quality: QualitySettings;
  particleSeed?: number;
  anchors?: WorldAnchors;
}>;

function subterraneanState(
  state: AtmosphereState,
  base: ConstellationState,
): ConstellationState {
  const shadowOpacity = state.shadowLength > 0
    ? Math.max(base.shadowOpacity, clamp01(state.shadowLength / 14) * 0.84)
    : 0;
  return Object.freeze({
    progress: state.progress,
    opacity: state.constellationIntensity,
    cutawayOpacity: state.cutawayOpacity,
    haloOpacity: state.warningHaloOpacity,
    haloScale: state.warningHaloScale,
    skyVeilOpacity: state.skyVeilOpacity,
    shadowLength: state.shadowLength,
    shadowOpacity,
    branchesVisible: state.constellationIntensity > 0.03,
  });
}

function createSkyMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      upperColor: { value: new Color('#738EAF') },
      horizonColor: { value: new Color('#E2BC84') },
      duskUpperColor: { value: new Color('#465A7C') },
      duskHorizonColor: { value: new Color('#C78558') },
      duskMix: { value: 0 },
      warningVeil: { value: 0 },
    },
    vertexShader: `
      varying float vSkyHeight;

      void main() {
        vSkyHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 upperColor;
      uniform vec3 horizonColor;
      uniform vec3 duskUpperColor;
      uniform vec3 duskHorizonColor;
      uniform float duskMix;
      uniform float warningVeil;
      varying float vSkyHeight;

      void main() {
        vec3 upper = mix(upperColor, duskUpperColor, duskMix);
        vec3 horizon = mix(horizonColor, duskHorizonColor, duskMix);
        float heightMix = smoothstep(-0.12, 0.72, vSkyHeight);
        float horizonBand = 1.0 - smoothstep(0.02, 0.42, abs(vSkyHeight));
        vec3 color = mix(horizon, upper, heightMix);
        color += horizon * horizonBand * 0.07;
        float veil = min(0.58, warningVeil * 2.3);
        color = mix(color, color * vec3(0.54, 0.62, 0.76), veil);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    depthTest: true,
    depthWrite: false,
    side: BackSide,
    toneMapped: true,
    fog: false,
  });
}

export function createAtmosphere(options: CreateAtmosphereOptions): Atmosphere {
  const group = new Group();
  group.name = 'effects:atmosphere';

  const skyVeil = new Mesh(
    new SphereGeometry(88, 32, 16),
    createSkyMaterial(),
  );
  skyVeil.name = 'effect:atmospheric-gradient-sky';
  skyVeil.renderOrder = -900;
  skyVeil.frustumCulled = false;
  skyVeil.visible = true;
  group.add(skyVeil);

  const fogOpeningColor = new Color('#8EA5B8');
  const fogDuskColor = new Color('#52677F');
  const sunOpeningColor = new Color('#FFD18A');
  const sunDuskColor = new Color('#E7A45F');
  const skyOpeningColor = new Color('#90A9CB');
  const skyDuskColor = new Color('#647B9B');
  const groundOpeningColor = new Color('#20372F');
  const groundDuskColor = new Color('#17282B');

  const fog = new FogExp2(fogOpeningColor, 0.0065);
  fog.name = 'atmosphere:exponential-fog';

  const sun = new DirectionalLight('#FFD18A', 2.15);
  sun.name = 'light:warm-sun';
  sun.position.set(-18, 26, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(options.quality.shadowMapSize, options.quality.shadowMapSize);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 26;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 72;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  group.add(sun, sun.target);

  const sky = new HemisphereLight('#90A9CB', '#20372F', 1.1);
  sky.name = 'light:cool-hemisphere';
  group.add(sky);

  const doorwayLights = Object.freeze([
    new PointLight('#E0A43A', 0, 8.5, 1.75),
    new PointLight('#F2D9A6', 0, 5.5, 2),
  ]);
  doorwayLights[0].name = 'light:doorway-hearth';
  doorwayLights[1].name = 'light:doorway-lantern';
  if (options.anchors) {
    const [x, y, z] = options.anchors.doorway;
    doorwayLights[0].position.set(x, y, z);
    doorwayLights[1].position.set(x - 0.8, y - 0.45, z + 0.35);
  } else {
    doorwayLights[0].position.set(0, 1.8, 0.3);
    doorwayLights[1].position.set(-0.8, 1.35, 0.65);
  }
  group.add(doorwayLights[0], doorwayLights[1]);

  const contactGeometry = new CircleGeometry(1, 24);
  const contactMaterial = new MeshBasicMaterial({
    color: '#20372F',
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const contactShadows = Object.freeze([
    new Mesh(contactGeometry, contactMaterial),
    new Mesh(contactGeometry, contactMaterial),
    new Mesh(contactGeometry, contactMaterial),
  ]);
  const contactPositions = [[0, 0.018, 0], [-5.2, 0.018, 4.8], [5.8, 0.018, -3.6]] as const;
  const groundOrigin = options.anchors?.warning ?? [0, 0, 0];
  contactShadows.forEach((shadow, index) => {
    const position = contactPositions[index];
    shadow.name = `effect:contact-shadow:${index}`;
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(
      groundOrigin[0] + position[0],
      groundOrigin[1] + position[1],
      groundOrigin[2] + position[2],
    );
    shadow.scale.set(1.8 + index * 0.35, 0.65 + index * 0.12, 1);
    shadow.renderOrder = 5;
    group.add(shadow);
  });

  const particles = createParticleSystem({
    quality: options.quality,
    seed: options.particleSeed,
  });
  const subterranean = createSubterraneanConstellation({
    seed: options.particleSeed,
    facetCount: Math.max(18, Math.round(26 * options.quality.particleDensity)),
  });
  if (options.anchors) subterranean.group.position.set(...options.anchors.warning);
  group.add(particles.group, subterranean.group);

  let disposed = false;
  const effects: Atmosphere = Object.freeze({
    group,
    fog,
    sun,
    sky,
    skyVeil,
    doorwayLights,
    contactShadows,
    particles,
    subterranean,
    evaluate: (
      snapshot: EffectsSnapshot,
      directorState: EffectsDirectorState = {},
    ) => {
      const state = evaluateAtmosphere(snapshot, directorState);
      const dusk = smootherstep((state.progress - 0.62) / 0.38);
      fog.density = state.fogDensity;
      fog.color.copy(fogOpeningColor).lerp(fogDuskColor, dusk);
      sun.color.copy(sunOpeningColor).lerp(sunDuskColor, dusk);
      sun.intensity = 2.15 - dusk * 0.62;
      sky.color.copy(skyOpeningColor).lerp(skyDuskColor, dusk);
      sky.groundColor.copy(groundOpeningColor).lerp(groundDuskColor, dusk);
      sky.intensity = 1.1 - dusk * 0.32;
      skyVeil.material.uniforms.duskMix.value = dusk;
      skyVeil.material.uniforms.warningVeil.value = state.skyVeilOpacity;
      skyVeil.visible = true;
      doorwayLights[0].intensity = state.doorwayLight * 3.2;
      doorwayLights[1].intensity = state.doorwayLight * 1.65;
      particles.evaluate(
        Number.isFinite(snapshot.time) ? snapshot.time : 0,
        state.particleOpacity,
      );
      subterranean.applyState(
        subterraneanState(state, constellationState(state.progress)),
      );
      return state;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      particles.dispose();
      subterranean.dispose();
      skyVeil.geometry.dispose();
      skyVeil.material.dispose();
      contactGeometry.dispose();
      contactMaterial.dispose();
      group.clear();
    },
  });
  effects.evaluate({ time: 0, progress: 0 });
  return effects;
}
