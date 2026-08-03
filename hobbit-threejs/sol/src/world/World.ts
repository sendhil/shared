import {
  CircleGeometry,
  Color,
  Group,
  Material,
  Mesh,
  Object3D,
  RingGeometry,
  Scene,
} from 'three';
import { createWorldAnchors, type WorldAnchors } from './anchors';
import { createArchitecture, createHomePlans, type HomePlan } from './architecture';
import { createWorldMaterials, type WorldMaterials } from './materials';
import { PALETTE } from './palette';
import { createPropPlacements, createProps, updateProps, type PropPlacement } from './props';
import { createSkyEnvironment } from './sky';
import { createTerrain } from './terrain';
import {
  createVegetation,
  createVegetationData,
  disposeVegetation,
  updateVegetation,
  VEGETATION_COUNTS,
  type VegetationData,
} from './vegetation';

export type WorldCounts = Readonly<{
  heroHomes: number;
  distantHomes: number;
  orchardTrees: number;
  grassInstances: number;
  flowers: number;
  hedgeSegments: number;
  fieldTufts: number;
  props: number;
}>;

export type WorldGraph = Readonly<{
  seed: number;
  anchors: WorldAnchors;
  counts: WorldCounts;
  homes: readonly HomePlan[];
  props: readonly PropPlacement[];
  vegetation: VegetationData;
}>;

export type WorldCueState = Readonly<{
  progress?: number;
  season?: number;
}>;

export type WorldHandle = Readonly<{
  seed: number;
  root: Group;
  graph: WorldGraph;
  anchors: WorldAnchors;
  counts: WorldCounts;
  materials: WorldMaterials;
  updateWorld(time: number, cues?: WorldCueState): void;
  dispose(): void;
}>;

export function createWorldGraph(seed = 111): WorldGraph {
  if (!Number.isFinite(seed)) throw new RangeError('world seed must be finite');
  const homes = createHomePlans(seed);
  const props = createPropPlacements(seed);
  const vegetation = createVegetationData(seed);
  const counts = Object.freeze({
    heroHomes: homes.filter((home) => home.detail === 'hero').length,
    distantHomes: homes.filter((home) => home.detail === 'distant').length,
    orchardTrees: vegetation.trees.length,
    grassInstances: vegetation.grass.length,
    flowers: vegetation.flowers.length,
    hedgeSegments: vegetation.hedges.length,
    fieldTufts: vegetation.fieldTufts.length,
    props: props.length,
  });
  return Object.freeze({
    seed,
    anchors: createWorldAnchors(seed),
    counts,
    homes,
    props,
    vegetation,
  });
}

function addWaterAndShore(root: Group, graph: WorldGraph, materials: WorldMaterials): void {
  const pond = new Mesh(new CircleGeometry(4.15, 48), materials.water);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(...graph.anchors.pond);
  pond.name = 'water:pond';
  pond.renderOrder = 2;
  const shore = new Mesh(new RingGeometry(4.08, 4.7, 48, 1), materials.soil);
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(graph.anchors.pond[0], graph.anchors.pond[1] - 0.035, graph.anchors.pond[2]);
  shore.name = 'terrain:pond-shore';
  shore.receiveShadow = true;
  root.add(shore, pond);
}

function addAnchorObjects(root: Group, anchors: WorldAnchors): void {
  for (const [name, position] of Object.entries(anchors)) {
    const anchor = new Object3D();
    anchor.name = `anchor:${name}`;
    anchor.position.set(...position);
    anchor.userData.anchor = name;
    root.add(anchor);
  }
}

function seasonalColor(target: Color, season: number): Color {
  const wrapped = ((season % 1) + 1) % 1;
  const summer = new Color(PALETTE.orchardGreen);
  const autumn = new Color('#8A6538');
  const winter = new Color('#9AA39A');
  const spring = new Color('#64844A');
  if (wrapped < 0.25) return target.lerpColors(summer, autumn, wrapped * 4);
  if (wrapped < 0.5) return target.lerpColors(autumn, winter, (wrapped - 0.25) * 4);
  if (wrapped < 0.75) return target.lerpColors(winter, spring, (wrapped - 0.5) * 4);
  return target.lerpColors(spring, summer, (wrapped - 0.75) * 4);
}

export function createWorld(scene: Scene, seed = 111): WorldHandle {
  const graph = createWorldGraph(seed);
  const materials = createWorldMaterials(undefined, seed);
  const root = new Group();
  root.name = 'world:lantern-hill';
  root.add(createSkyEnvironment());

  const terrain = createTerrain(seed, 72);
  terrain.material.dispose();
  terrain.material = materials.ground;
  root.add(terrain);
  addWaterAndShore(root, graph, materials);

  const architecture = createArchitecture(materials, graph.homes, seed);
  for (const home of architecture.homes) root.add(home);
  const vegetation = createVegetation(materials, graph.vegetation, seed);
  const props = createProps(materials, graph.props);
  root.add(vegetation.root, props.root);
  addAnchorObjects(root, graph.anchors);
  scene.add(root);

  const seasonColor = new Color();
  let disposed = false;
  const update = (time: number, cues: WorldCueState = {}): void => {
    if (disposed) throw new Error('cannot update a disposed world');
    if (!Number.isFinite(time)) throw new RangeError('world time must be finite');
    updateVegetation(vegetation, time);
    updateProps(props, time);
    architecture.windObjects.forEach((object, index) => {
      if (object.userData.windKind === 'smoke') {
        const base = object.userData.basePosition as readonly [number, number, number];
        const baseScale = object.userData.baseScale as readonly [number, number, number];
        const cycle = ((time * 0.17 + index * 0.31) % 1 + 1) % 1;
        object.position.set(
          base[0] + Math.sin(time * 0.46 + index) * (0.12 + cycle * 0.22),
          base[1] + cycle * 1.25,
          base[2] + Math.cos(time * 0.33 + index * 0.7) * 0.09,
        );
        const growth = 0.72 + cycle * 0.58;
        object.scale.set(
          baseScale[0] * growth,
          baseScale[1] * growth,
          baseScale[2] * growth,
        );
      } else {
        object.rotation.z = Number(object.userData.baseRotation) + Math.sin(time * 0.82 + index * 0.91) * 0.045;
      }
    });
    const season = Number.isFinite(cues.season) ? Number(cues.season) : Number.isFinite(cues.progress) ? Number(cues.progress) : time / 130;
    seasonalColor(seasonColor, season);
    materials.foliageLight.color.copy(seasonColor);
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    scene.remove(root);
    disposeVegetation(vegetation);
    const geometries = new Set<{ dispose(): void }>();
    const extraMaterials = new Set<Material>();
    const ownedMaterials = new Set<Material>();
    for (const value of Object.values(materials)) {
      if (value instanceof Material) ownedMaterials.add(value);
    }
    root.traverse((object) => {
      if (object instanceof Mesh) {
        geometries.add(object.geometry);
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of meshMaterials) if (!ownedMaterials.has(material)) extraMaterials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of extraMaterials) material.dispose();
    materials.dispose();
    root.clear();
  };

  return Object.freeze({
    seed,
    root,
    graph,
    anchors: graph.anchors,
    counts: graph.counts,
    materials,
    updateWorld: update,
    dispose,
  });
}

export function updateWorld(world: WorldHandle, time: number, cues: WorldCueState = {}): void {
  world.updateWorld(time, cues);
}

export { VEGETATION_COUNTS };
