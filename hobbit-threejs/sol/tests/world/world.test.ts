import {
  Color,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
  TubeGeometry,
} from 'three';
import { describe, expect, it } from 'vitest';
import { REQUIRED_ANCHORS } from '../../src/world/anchors';
import { evaluateWindTransform } from '../../src/world/vegetation';
import { createWorld, createWorldGraph } from '../../src/world/World';

const everyFinite = (values: readonly number[]) => values.every(Number.isFinite);

describe('Lantern Hill world graph', () => {
  it('creates a populated deterministic inventory', () => {
    const a = createWorldGraph(111);
    const b = createWorldGraph(111);
    const other = createWorldGraph(112);

    expect(a).toEqual(b);
    expect(a.vegetation.grass.slice(0, 20)).not.toEqual(other.vegetation.grass.slice(0, 20));
    expect(a.anchors).toEqual(expect.objectContaining({
      doorway: expect.anything(),
      invitation: expect.anything(),
      crowd: expect.anything(),
      pond: expect.anything(),
    }));
    expect(Object.keys(a.anchors).sort()).toEqual([...REQUIRED_ANCHORS].sort());
    expect(a.counts).toMatchObject({ heroHomes: 3, distantHomes: 7, orchardTrees: 28, grassInstances: 4500, flowers: 90, hedgeSegments: 24 });
    expect(a.counts.props).toBeGreaterThan(45);
  });

  it('authors three distinct complete foreground homes and seven distant variants', () => {
    const graph = createWorldGraph(111);
    const heroes = graph.homes.filter((home) => home.detail === 'hero');
    const distant = graph.homes.filter((home) => home.detail === 'distant');

    expect(heroes).toHaveLength(3);
    expect(distant).toHaveLength(7);
    expect(new Set(heroes.map((home) => `${home.name}:${home.doorColor}:${home.windowCount}:${home.shellScale.join('/')}`)).size).toBe(3);
    expect(heroes.every((home) => home.features.includes('round-door') && home.features.includes('timber-ribs'))).toBe(true);
    expect(heroes.every((home) => home.features.includes('copper-gutter') && home.features.includes('planted-roof') && home.features.includes('door-light'))).toBe(true);
    expect(heroes.every((home) => home.windowCount >= 2 && home.ribCount >= 3)).toBe(true);
  });

  it('places the settlement vocabulary with grounded, finite transforms', () => {
    const graph = createWorldGraph(111);
    const kinds = new Set(graph.props.map((prop) => prop.kind));

    expect([...kinds]).toEqual(expect.arrayContaining([
      'path-stone', 'bridge', 'field-card', 'fence', 'garden-row', 'party-table', 'cart',
      'lantern-arch', 'invitation', 'flower-basket', 'tool', 'ribbon-spool', 'laundry', 'lantern',
    ]));
    expect(graph.props.every((prop) => everyFinite(prop.transform))).toBe(true);
    expect(Object.values(graph.anchors).every((anchor) => everyFinite(anchor))).toBe(true);
    expect(graph.vegetation.grass.every((transform) => everyFinite(transform))).toBe(true);
    expect(graph.vegetation.trees.every((transform) => everyFinite(transform))).toBe(true);
    expect(graph.vegetation.flowers.every((transform) => everyFinite(transform))).toBe(true);
    expect(graph.vegetation.hedges.every((transform) => everyFinite(transform))).toBe(true);
  });

  it('evaluates deterministic finite wind transforms at arbitrary seek times', () => {
    const base = createWorldGraph(111).vegetation.grass[137];
    const atStart = evaluateWindTransform(base, 0, 137, 'grass');
    const afterSeek = evaluateWindTransform(base, 78.125, 137, 'grass');

    expect(evaluateWindTransform(base, 78.125, 137, 'grass')).toEqual(afterSeek);
    expect(afterSeek).not.toEqual(atStart);
    expect(everyFinite(afterSeek)).toBe(true);
    expect(Math.abs(afterSeek[3])).toBeLessThan(0.24);
    expect(Math.abs(afterSeek[5])).toBeLessThan(0.24);
  });

  it('constructs a finished, instanced scene graph and disposes it cleanly', () => {
    const scene = new Scene();
    const world = createWorld(scene, 111);
    const grass = world.root.getObjectByName('vegetation:grass');
    const trunks = world.root.getObjectByName('vegetation:orchard-trunks');
    const flowers = world.root.getObjectByName('vegetation:flower-petals');
    const geometryTypes = new Set<string>();

    world.root.traverse((object) => {
      if ('geometry' in object && object.geometry && typeof object.geometry === 'object' && 'type' in object.geometry) {
        geometryTypes.add(String(object.geometry.type));
      }
    });

    expect(grass).toBeInstanceOf(InstancedMesh);
    expect((grass as InstancedMesh).count).toBe(4500);
    expect((trunks as InstancedMesh).count).toBe(28);
    expect((flowers as InstancedMesh).count).toBe(450);
    expect(world.root.children.filter((child) => child.name.startsWith('architecture:hero:'))).toHaveLength(3);
    expect([...geometryTypes]).toEqual(expect.arrayContaining([
      'SphereGeometry', 'TorusGeometry', 'TubeGeometry', 'ExtrudeGeometry', 'LatheGeometry', 'BufferGeometry',
    ]));

    for (const time of [0, 31.75, 99.125]) {
      world.updateWorld(time, { progress: time / 130, season: time / 130 });
      world.root.updateMatrixWorld(true);
      world.root.traverse((object) => expect(everyFinite(object.matrixWorld.elements)).toBe(true));
      const matrix = new Matrix4();
      for (const index of [0, 111, 4499]) {
        (grass as InstancedMesh).getMatrixAt(index, matrix);
        expect(everyFinite(matrix.elements)).toBe(true);
      }
    }

    expect(scene.children).toContain(world.root);
    world.dispose();
    expect(scene.children).not.toContain(world.root);
  });

  it('adds varied crossed vegetation silhouettes within the existing draw budget', () => {
    const world = createWorld(new Scene(), 111);
    const namedMesh = (name: string): InstancedMesh => {
      const object = world.root.getObjectByName(name);
      expect(object).toBeInstanceOf(InstancedMesh);
      return object as InstancedMesh;
    };
    const grass = namedMesh('vegetation:grass');
    const fieldTufts = namedMesh('vegetation:field-tufts');
    const coloredMeshes = [
      grass,
      fieldTufts,
      namedMesh('vegetation:orchard-crowns'),
      namedMesh('vegetation:hedges'),
      namedMesh('vegetation:flower-petals'),
    ];
    let meshCount = 0;
    world.root.traverse((object) => { if (object instanceof Mesh) meshCount += 1; });

    expect(meshCount).toBe(562);
    expect(grass.count).toBe(4500);
    expect(fieldTufts.count).toBe(480);
    expect(grass.geometry.getAttribute('position').count).toBe(27);
    expect(fieldTufts.geometry.getAttribute('position').count).toBe(27);
    for (const mesh of coloredMeshes) {
      expect(mesh.instanceColor).not.toBeNull();
      const color = new Color();
      const sampled = new Set<string>();
      for (let index = 0; index < Math.min(mesh.count, 72); index += 1) {
        mesh.getColorAt(index, color);
        sampled.add(color.getHexString());
      }
      expect(sampled.size).toBeGreaterThanOrEqual(3);
    }

    world.dispose();
  });

  it('breaks up every roof shell with subtle deterministic colors on one shared material', () => {
    const world = createWorld(new Scene(), 111);
    const repeated = createWorld(new Scene(), 111);
    const shells = [world, repeated].map((handle) => handle.root.children
      .filter((child) => child.name.startsWith('architecture:'))
      .map((home) => home.getObjectByName('structure:earthen-shell'))
      .filter((shell): shell is Mesh => shell instanceof Mesh));

    expect(shells[0]).toHaveLength(10);
    for (const [index, shell] of shells[0].entries()) {
      expect(shell.material).toBe(world.materials.roof);
      expect((shell.material as MeshStandardMaterial).vertexColors).toBe(true);
      const color = shell.geometry.getAttribute('color');
      const position = shell.geometry.getAttribute('position');
      expect(color?.count).toBe(position.count);
      const values = Array.from(color.array);
      expect(Math.min(...values)).toBeGreaterThan(0.55);
      expect(new Set(values.map((value) => value.toFixed(3))).size).toBeGreaterThanOrEqual(8);
      expect(values).toEqual(Array.from(shells[1][index].geometry.getAttribute('color').array));
    }

    world.dispose();
    repeated.dispose();
  });

  it('reconstructs chimney smoke from time after an arbitrary seek', () => {
    const scene = new Scene();
    const world = createWorld(scene, 111);
    const smoke: { position: { toArray(): number[] } }[] = [];
    world.root.traverse((object) => {
      if (object.name === 'detail:chimney-smoke') smoke.push(object);
    });

    expect(smoke.length).toBeGreaterThanOrEqual(20);
    world.updateWorld(47.25);
    const first = smoke.map((puff) => puff.position.toArray());
    world.updateWorld(3.5);
    expect(smoke.map((puff) => puff.position.toArray())).not.toEqual(first);
    world.updateWorld(47.25);
    expect(smoke.map((puff) => puff.position.toArray())).toEqual(first);
    expect(first.flat().every(Number.isFinite)).toBe(true);
    world.dispose();
  });

  it('keeps hero timber ribs slender and inside each roof envelope', () => {
    const world = createWorld(new Scene(), 111);
    const heroes = world.root.children.filter((child) => child.name.startsWith('architecture:hero:'));

    for (const home of heroes) {
      const plan = home.userData.plan as { shellScale: readonly [number, number, number] };
      const ribs: Mesh<TubeGeometry>[] = [];
      home.traverse((object) => {
        if (object instanceof Mesh && object.name.startsWith('detail:timber-rib:')) {
          ribs.push(object as Mesh<TubeGeometry>);
        }
      });

      expect(ribs.length).toBeGreaterThanOrEqual(3);
      for (const rib of ribs) {
        rib.geometry.computeBoundingBox();
        const bounds = rib.geometry.boundingBox;
        expect(bounds).not.toBeNull();
        if (!bounds) continue;
        expect(bounds.max.y).toBeLessThanOrEqual(plan.shellScale[1] * 1.08);
        expect(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)))
          .toBeLessThanOrEqual(plan.shellScale[0] * 0.58);
        expect(rib.geometry.parameters.radius).toBeLessThanOrEqual(0.05);
      }
    }

    world.dispose();
  });

  it('keeps chimney smoke translucent, small, and vertically wispy after evaluation', () => {
    const world = createWorld(new Scene(), 111);
    const smoke: Mesh<SphereGeometry, MeshStandardMaterial>[] = [];
    world.root.traverse((object) => {
      if (object instanceof Mesh && object.name === 'detail:chimney-smoke') {
        smoke.push(object as Mesh<SphereGeometry, MeshStandardMaterial>);
      }
    });
    world.updateWorld(47.25);

    expect(smoke.length).toBeGreaterThanOrEqual(20);
    for (const puff of smoke) {
      expect(puff.material.transparent).toBe(true);
      expect(puff.material.opacity).toBeLessThanOrEqual(0.09);
      expect(puff.geometry.parameters.radius).toBeLessThanOrEqual(0.18);
      expect(puff.scale.y / puff.scale.x).toBeLessThanOrEqual(0.58);
      expect(puff.scale.z / puff.scale.x).toBeLessThanOrEqual(0.78);
    }

    world.dispose();
  });
});
