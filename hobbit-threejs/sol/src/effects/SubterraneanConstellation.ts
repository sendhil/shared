import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { randomAt } from '../world/random';

export type ConstellationState = Readonly<{
  progress: number;
  opacity: number;
  cutawayOpacity: number;
  haloOpacity: number;
  haloScale: number;
  skyVeilOpacity: number;
  shadowLength: number;
  shadowOpacity: number;
  branchesVisible: boolean;
}>;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function smootherstep(value: number): number {
  const progress = clamp01(value);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function rangeProgress(value: number, start: number, end: number): number {
  return clamp01((value - start) / (end - start));
}

const DOORWAY_SHADOW_HOLD_START_PROGRESS = 107.28 / 110.7824375;

export function constellationState(progress: number): ConstellationState {
  const safeProgress = clamp01(progress);
  const reveal = smootherstep(rangeProgress(safeProgress, 0.34, 0.48));
  const branchFade = 1 - smootherstep(rangeProgress(safeProgress, 0.76, 0.94));
  const cutawayFade = 1 - smootherstep(rangeProgress(safeProgress, 0.68, 0.84));
  const warningRise = smootherstep(rangeProgress(safeProgress, 0.8, 0.87));
  const resolution = smootherstep(rangeProgress(safeProgress, 0.96, 1));
  const haloHandoff = smootherstep(
    rangeProgress(safeProgress, DOORWAY_SHADOW_HOLD_START_PROGRESS, 1),
  );
  const shadowProgress = smootherstep(rangeProgress(safeProgress, 0.78, 0.98));
  const opacity = clamp01(0.82 * reveal * branchFade);
  const cutawayOpacity = clamp01(0.68 * reveal * cutawayFade);
  const haloOpacity = 0.68 * warningRise * (1 - haloHandoff * 0.62);
  const haloScale = 0.82 + warningRise * 0.22 - haloHandoff * 0.14;
  const skyVeilOpacity = 0.22 * warningRise * (1 - resolution * 0.35);
  const shadowLength = 13.2 * shadowProgress;
  const shadowOpacity = 0.84 * shadowProgress;

  return Object.freeze({
    progress: safeProgress,
    opacity,
    cutawayOpacity,
    haloOpacity,
    haloScale,
    skyVeilOpacity,
    shadowLength,
    shadowOpacity,
    branchesVisible: opacity > 0.03,
  });
}

const BRANCH_POINTS = Object.freeze([
  [[0, -2.2, 0], [-1.2, -2.7, -1.4], [-3.8, -3.1, -2.4], [-7.2, -3.6, -3.1]],
  [[0, -2.2, 0], [1.1, -2.6, -1.1], [3.4, -3.3, -2.1], [6.8, -3.9, -1.5]],
  [[-0.3, -2.3, -0.2], [-1.1, -3.1, 1.1], [-2.7, -3.7, 3.1], [-4.8, -4.1, 5.6]],
  [[0.2, -2.2, 0.1], [1.2, -3, 1.3], [3.3, -3.6, 3.5], [5.8, -4.2, 5.1]],
  [[-1.8, -2.8, -1.8], [-2.5, -3.5, -0.5], [-3.7, -4.1, 0.5], [-5.9, -4.5, 1.5]],
  [[2, -2.9, -1.5], [2.7, -3.7, -0.1], [4.2, -4.2, 0.8], [6.1, -4.8, 2.4]],
  [[0, -2.3, 0], [0.1, -3.4, 1.8], [-0.2, -4.5, 4.1], [0.6, -5.1, 7.2]],
] as const);

function branchCurve(points: readonly (readonly number[])[]): CatmullRomCurve3 {
  return new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y, z)),
    false,
    'catmullrom',
    0.45,
  );
}

function createCutawayMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      opacity: { value: 0 },
      color: { value: new Color('#6E86A6') },
    },
    vertexShader: `
      varying float vDepthFade;
      void main() {
        vDepthFade = smoothstep(0.0, 8.0, -position.y + 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float opacity;
      uniform vec3 color;
      varying float vDepthFade;
      void main() {
        float alpha = opacity * mix(0.12, 0.62, vDepthFade);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

export type SubterraneanConstellation = Readonly<{
  group: Group;
  cutawayShell: Mesh<SphereGeometry, ShaderMaterial>;
  facets: InstancedMesh<IcosahedronGeometry, MeshStandardMaterial>;
  halo: Group;
  haloLight: PointLight;
  shadow: Mesh<PlaneGeometry, MeshBasicMaterial>;
  evaluate(progress: number): ConstellationState;
  applyState(state: ConstellationState): void;
  dispose(): void;
}>;

export type CreateConstellationOptions = Readonly<{
  seed?: number;
  facetCount?: number;
}>;

export function createSubterraneanConstellation(
  options: CreateConstellationOptions = {},
): SubterraneanConstellation {
  const seed = options.seed ?? 111;
  const facetCount = Math.max(1, Math.floor(options.facetCount ?? 24));
  const group = new Group();
  group.name = 'effect:subterranean-constellation';

  const cutawayShell = new Mesh(
    new SphereGeometry(8.4, 32, 16, 0, Math.PI * 2, Math.PI * 0.46, Math.PI * 0.54),
    createCutawayMaterial(),
  );
  cutawayShell.name = 'effect:subterranean-cutaway-shell';
  cutawayShell.scale.set(1.35, 0.82, 1.12);
  cutawayShell.renderOrder = 10;
  cutawayShell.visible = false;
  group.add(cutawayShell);

  const branchGroup = new Group();
  branchGroup.name = 'effect:subterranean-branches';
  branchGroup.renderOrder = 31;
  const branchMaterial = new MeshBasicMaterial({
    color: '#E0A43A',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  for (const [index, points] of BRANCH_POINTS.entries()) {
    const tube = new Mesh(
      new TubeGeometry(branchCurve(points), 24, index === 6 ? 0.095 : 0.065, 6, false),
      branchMaterial,
    );
    tube.name = `effect:subterranean-branch:${index}`;
    tube.renderOrder = 31;
    branchGroup.add(tube);
  }
  branchGroup.visible = false;
  group.add(branchGroup);

  const facetGeometry = new IcosahedronGeometry(0.19, 0);
  const facetMaterial = new MeshStandardMaterial({
    color: '#E0A43A',
    emissive: '#A45C0A',
    emissiveIntensity: 1.4,
    roughness: 0.32,
    metalness: 0.46,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const facets = new InstancedMesh(facetGeometry, facetMaterial, facetCount);
  facets.name = 'effect:subterranean-facets';
  facets.renderOrder = 32;
  facets.visible = false;
  const transform = new Matrix4();
  const rotation = new Quaternion();
  const scale = new Vector3();
  for (let index = 0; index < facetCount; index += 1) {
    const angle = randomAt(seed, index * 7) * Math.PI * 2;
    const radius = 1.1 + randomAt(seed, index * 7 + 1) * 6.2;
    const position = new Vector3(
      Math.cos(angle) * radius,
      -2.5 - randomAt(seed, index * 7 + 2) * 2.8,
      Math.sin(angle) * radius * 0.78,
    );
    rotation.setFromAxisAngle(
      new Vector3(
        randomAt(seed, index * 7 + 3),
        randomAt(seed, index * 7 + 4),
        randomAt(seed, index * 7 + 5),
      ).normalize(),
      randomAt(seed, index * 7 + 6) * Math.PI,
    );
    const scalar = 0.65 + randomAt(seed ^ 0x61c8, index) * 1.15;
    scale.set(scalar, scalar * 1.35, scalar);
    transform.compose(position, rotation, scale);
    facets.setMatrixAt(index, transform);
    facets.setColorAt(index, new Color(index % 3 === 0 ? '#F2D9A6' : '#E0A43A'));
  }
  facets.instanceMatrix.needsUpdate = true;
  group.add(facets);

  const halo = new Group();
  halo.name = 'effect:warning-broken-halo';
  halo.position.set(0, 3.35, 3.3);
  halo.visible = false;
  const haloMaterial = new MeshBasicMaterial({
    color: '#E8B65D',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: true,
    side: DoubleSide,
  });
  const outerArcGeometry = new TorusGeometry(1.5, 0.06, 8, 48, Math.PI * 1.62);
  const outerArc = new Mesh(outerArcGeometry, haloMaterial);
  outerArc.name = 'effect:warning-halo-outer-arc';
  outerArc.rotation.z = 0.22;
  const innerArcGeometry = new TorusGeometry(0.92, 0.035, 6, 36, Math.PI * 1.28);
  const innerArc = new Mesh(innerArcGeometry, haloMaterial);
  innerArc.name = 'effect:warning-halo-inner-arc';
  innerArc.rotation.z = 2.45;
  halo.add(outerArc, innerArc);

  const haloFacetGeometry = new IcosahedronGeometry(0.11, 0);
  for (let index = 0; index < 7; index += 1) {
    const angle = 0.35 + index / 7 * Math.PI * 2;
    const radius = index % 2 === 0 ? 1.23 : 1.7;
    const facet = new Mesh(haloFacetGeometry, haloMaterial);
    facet.name = `effect:warning-halo-facet:${index}`;
    facet.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0.03,
    );
    facet.scale.setScalar(index % 3 === 0 ? 1.35 : 0.9);
    halo.add(facet);
  }
  halo.children.forEach((child) => { child.renderOrder = 45; });
  const haloLight = new PointLight('#F2C46D', 0, 7.5, 2);
  haloLight.name = 'light:warning-halo-glow';
  haloLight.castShadow = false;
  halo.add(haloLight);
  group.add(halo);

  const shadowMaterial = new MeshBasicMaterial({
    color: '#25172B',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const shadow = new Mesh(new PlaneGeometry(1, 1), shadowMaterial);
  shadow.name = 'effect:doorway-impossible-shadow';
  shadow.rotation.x = Math.PI / 2;
  shadow.position.y = 0.025;
  shadow.renderOrder = 40;
  shadow.visible = false;
  group.add(shadow);

  const applyState = (state: ConstellationState): void => {
    const opacity = clamp01(state.opacity);
    const cutawayOpacity = clamp01(state.cutawayOpacity);
    const haloOpacity = clamp01(state.haloOpacity);
    const shadowOpacity = clamp01(state.shadowOpacity);
    const shadowLength = Math.min(14, Math.max(0, Number.isFinite(state.shadowLength) ? state.shadowLength : 0));
    branchMaterial.opacity = opacity;
    branchGroup.visible = state.branchesVisible && opacity > 0.001;
    facetMaterial.opacity = opacity;
    facets.visible = opacity > 0.001;
    cutawayShell.material.uniforms.opacity.value = cutawayOpacity;
    cutawayShell.visible = cutawayOpacity > 0.001;
    haloMaterial.opacity = haloOpacity * 0.78;
    haloLight.intensity = haloOpacity * 2.35;
    halo.visible = haloOpacity > 0.001;
    halo.scale.setScalar(Math.min(1.4, Math.max(0.7, state.haloScale)));
    shadowMaterial.opacity = shadowOpacity;
    shadow.visible = shadowOpacity > 0.001 && shadowLength > 0.001;
    shadow.scale.set(2.25 + shadowLength * 0.14, Math.max(0.001, shadowLength), 1);
    shadow.position.z = 2.65 + shadowLength * 0.5;
  };

  let disposed = false;
  const effect: SubterraneanConstellation = Object.freeze({
    group,
    cutawayShell,
    facets,
    halo,
    haloLight,
    shadow,
    evaluate: (progress: number) => {
      const state = constellationState(progress);
      applyState(state);
      return state;
    },
    applyState,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const child of branchGroup.children) {
        if (child instanceof Mesh) child.geometry.dispose();
      }
      branchMaterial.dispose();
      cutawayShell.geometry.dispose();
      cutawayShell.material.dispose();
      facetGeometry.dispose();
      facetMaterial.dispose();
      outerArcGeometry.dispose();
      innerArcGeometry.dispose();
      haloFacetGeometry.dispose();
      haloMaterial.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
      group.clear();
    },
  });
  effect.applyState(constellationState(0));
  return effect;
}
