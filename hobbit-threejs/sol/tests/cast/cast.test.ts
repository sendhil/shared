import { Group, Mesh, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import {
  castSemanticProgress,
  createCast,
  evaluateCast,
} from '../../src/cast/Cast';
import { createCharacterRig } from '../../src/cast/CharacterRig';
import {
  PREPARATION_VIGNETTES,
  RESIDENT_COUNT,
  createResidentSpecs,
} from '../../src/cast/residents';
import { JOINT_NAMES, POSES, type Pose } from '../../src/cast/poses';
import { deriveCues } from '../../src/timeline/deriveCues';
import {
  buildNarrativeBeats,
  evaluateNarrative,
} from '../../src/timeline/NarrativeDirector';
import type { TimelineSnapshot } from '../../src/timeline/MasterTimeline';
import { createWorld } from '../../src/world/World';

const everyFinite = (values: readonly number[]) => values.every(Number.isFinite);

function castFrameAt(time: number, progress: number) {
  const scene = new Scene();
  const world = createWorld(scene, 111);
  const cast = createCast(world, 111);
  const frame = cast.evaluateCast(time, progress);
  cast.dispose();
  world.dispose();
  return frame;
}

function residentPose(frame: ReturnType<typeof castFrameAt>, id: string): Pose {
  const resident = frame.residents.find((state) => state.id === id);
  if (!resident) throw new Error(`missing resident ${id}`);
  return resident.pose;
}

function poseDistance(from: Pose, to: Pose): number {
  return JOINT_NAMES.reduce((total, joint) => total + from[joint].reduce(
    (jointTotal, value, axis) => jointTotal + Math.abs(value - to[joint][axis]),
    0,
  ), 0);
}

function worldMatrices(root: Group): readonly number[][] {
  root.updateMatrixWorld(true);
  const matrices: number[][] = [];
  root.traverse((object) => matrices.push(object.matrixWorld.toArray()));
  return matrices;
}

describe('Lantern Hill cast', () => {
  it('gives preparation workers distinct, purposeful weight', () => {
    const frame = castFrameAt(8, 0.1);
    const host = residentPose(frame, 'orin-vale');
    const carpenter = residentPose(frame, 'tern-oakhand');
    const cartWorker = residentPose(frame, 'bram-tilley');

    expect(carpenter.rightUpperArm[0]).toBeLessThan(-1.4);
    expect(cartWorker.torso[0]).toBeGreaterThan(0.25);
    expect(poseDistance(host, carpenter)).toBeGreaterThan(1);
    expect(poseDistance(carpenter, cartWorker)).toBeGreaterThan(1);
  });

  it('keeps the host calm and centered during the introduction', () => {
    const frame = castFrameAt(23, 0.31);
    const host = residentPose(frame, 'orin-vale');
    const listener = residentPose(frame, 'mara-finch');

    expect(poseDistance(host, POSES.present)).toBeLessThan(poseDistance(host, POSES.walk));
    expect(host.rightUpperArm[0]).toBeLessThan(-0.25);
    expect(poseDistance(host, listener)).toBeGreaterThan(0.5);
  });

  it('separates host composure from elder weight in the seasonal portrait', () => {
    const frame = castFrameAt(60, 0.64);
    const host = residentPose(frame, 'orin-vale');
    const elder = residentPose(frame, 'moss-amber');
    const neighbor = residentPose(frame, 'mara-finch');

    expect(poseDistance(host, POSES.idle)).toBeLessThan(0.25);
    expect(elder.torso[0]).toBeGreaterThan(0.06);
    expect(elder.head[1]).toBeLessThan(-0.25);
    expect(poseDistance(elder, neighbor)).toBeGreaterThan(0.35);
  });

  it('delays the elders before their weighted judgment lands', () => {
    const earlyFrame = castFrameAt(90, 0.78);
    const lateFrame = castFrameAt(96, 0.85);
    const earlyElder = residentPose(earlyFrame, 'moss-amber');
    const lateElder = residentPose(lateFrame, 'moss-amber');

    expect(Math.abs(earlyElder.head[1])).toBeLessThan(0.3);
    expect(lateElder.head[1]).toBeLessThan(-0.42);
    expect(lateElder.torso[0]).toBeGreaterThan(0.12);
    expect(poseDistance(earlyElder, lateElder)).toBeGreaterThan(0.45);
  });

  it('overlaps pointing and recoil during the spoken warning', () => {
    const frame = castFrameAt(103, 0.895);
    const host = residentPose(frame, 'orin-vale');
    const pointer = residentPose(frame, 'tob-wren');
    const gossip = residentPose(frame, 'sela-briar');

    expect(pointer.rightUpperArm[0]).toBeLessThan(-0.8);
    expect(gossip.torso[0]).toBeLessThan(-0.1);
    expect(poseDistance(pointer, gossip)).toBeGreaterThan(0.5);
    expect(poseDistance(host, POSES.present)).toBeLessThan(poseDistance(host, POSES.point));
  });

  it('holds a deterministic role-specific reaction through the ending', () => {
    const firstFrame = castFrameAt(110.5, 0.97);
    const laterFrame = castFrameAt(900, 0.97);
    const signatures = new Set(firstFrame.residents.map((resident) => JSON.stringify(resident.pose)));
    const host = residentPose(firstFrame, 'orin-vale');
    const elder = residentPose(firstFrame, 'moss-amber');
    const pointer = residentPose(firstFrame, 'tob-wren');
    const gossip = residentPose(firstFrame, 'sela-briar');

    expect(signatures.size).toBeGreaterThanOrEqual(6);
    expect(poseDistance(host, elder)).toBeGreaterThan(0.5);
    expect(poseDistance(pointer, gossip)).toBeGreaterThan(0.5);
    expect(laterFrame.residents.map((resident) => resident.pose)).toEqual(
      firstFrame.residents.map((resident) => resident.pose),
    );
  });

  it('maps every shared active beat into its authored semantic window', () => {
    const duration = 110.8;
    const cues = deriveCues(duration);
    const beats = buildNarrativeBeats(cues, duration);
    const semanticBoundaries = [
      0, 0.18, 0.25, 0.38, 0.46, 0.59, 0.7, 0.76, 0.86, 0.93, 1,
    ] as const;
    const snapshot = (time: number): TimelineSnapshot => ({
      time,
      duration,
      progress: time / duration,
      state: time === duration ? 'ended' : 'playing',
    });

    beats.forEach((beat, index) => {
      const state = evaluateNarrative(
        snapshot((beat.start + beat.end) / 2),
        cues,
      );
      const expected =
        (semanticBoundaries[index] + semanticBoundaries[index + 1]) / 2;

      expect(state.beatIndex).toBe(index);
      expect(castSemanticProgress(state)).toBeCloseTo(expected, 12);
      expect(castSemanticProgress(state)).toBe(castSemanticProgress(state));
    });
    expect(
      castSemanticProgress(evaluateNarrative(snapshot(duration), cues)),
    ).toBe(1);
  });

  it('authors one youthful host and thirteen distinct residents across all vignettes', () => {
    const residents = createResidentSpecs(111);
    const parameterSignatures = residents.map((resident) => JSON.stringify({
      proportions: resident.proportions,
      clothing: resident.clothing,
      hair: resident.hair,
      accessory: resident.accessory,
      age: resident.age,
      dominantHand: resident.dominantHand,
    }));

    expect(residents).toHaveLength(RESIDENT_COUNT);
    expect(RESIDENT_COUNT).toBe(14);
    expect(residents.filter((resident) => resident.isHost)).toHaveLength(1);
    expect(residents.filter((resident) => !resident.isHost)).toHaveLength(13);
    expect(residents.find((resident) => resident.isHost)).toMatchObject({ age: 'youthful', vignette: 'invitation-posting' });
    expect(new Set(residents.map((resident) => resident.id)).size).toBe(14);
    expect(new Set(residents.map((resident) => resident.name)).size).toBe(14);
    expect(new Set(parameterSignatures).size).toBe(14);
    expect(new Set(residents.map((resident) => resident.vignette))).toEqual(new Set(PREPARATION_VIGNETTES));
    for (const vignette of PREPARATION_VIGNETTES) {
      expect(residents.some((resident) => resident.vignette === vignette)).toBe(true);
    }
    expect(residents.some((resident) => resident.socialRole === 'gossip')).toBe(true);
    expect(residents.filter((resident) => resident.socialRole === 'older-skeptic')).toHaveLength(2);
    expect(residents.every((resident) => resident.crowdArc === 'inner' || resident.crowdArc === 'outer' || resident.isHost)).toBe(true);
  });

  it('builds a coherent articulated figure rather than a placeholder stick rig', () => {
    const resident = createResidentSpecs(111)[0];
    const rig = createCharacterRig(resident);
    const meshes: Mesh[] = [];
    rig.root.traverse((object) => {
      if (object instanceof Mesh) meshes.push(object);
    });

    expect(Object.keys(rig.joints)).toEqual(expect.arrayContaining([
      'hips', 'torso', 'neck', 'head',
      'leftUpperArm', 'leftLowerArm', 'leftHand',
      'rightUpperArm', 'rightLowerArm', 'rightHand',
      'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
      'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
    ]));
    expect(meshes.length).toBeGreaterThanOrEqual(24);
    expect(rig.root.getObjectByName('body:torso')).toBeTruthy();
    expect(rig.root.getObjectByName('body:hips')).toBeTruthy();
    expect(rig.root.getObjectByName('body:head')).toBeTruthy();
    expect(rig.root.getObjectByName('face:left-eye')).toBeTruthy();
    expect(rig.root.getObjectByName('face:right-eye')).toBeTruthy();
    expect(rig.root.getObjectByName('face:nose')).toBeTruthy();
    expect(rig.root.getObjectByName('body:left-hand')).toBeTruthy();
    expect(rig.root.getObjectByName('body:right-foot')).toBeTruthy();
    expect(rig.root.userData.proportions.height).toBeGreaterThan(2.2);
    expect(rig.root.userData.proportions.height).toBeLessThan(3.8);
    expect(worldMatrices(rig.root).flat().every(Number.isFinite)).toBe(true);

    rig.dispose();
  });

  it('constructs fourteen named residents with finite articulated transforms and authored props', () => {
    const scene = new Scene();
    const world = createWorld(scene, 111);
    const cast = createCast(world, 111);

    expect(cast.residents).toHaveLength(14);
    expect(cast.root.children).toHaveLength(14);
    expect(cast.root.getObjectByName('cast:host:orin-vale')).toBeTruthy();
    expect(cast.residents.every((resident) => resident.rig.root.parent === cast.root)).toBe(true);
    expect(cast.residents.every((resident) => resident.rig.propRoot.children.length > 0)).toBe(true);

    for (const [time, progress] of [[0, 0], [18.5, 0.14], [67.25, 0.52], [99.75, 0.77], [124, 0.96]] as const) {
      const frame = cast.evaluateCast(time, progress);
      expect(frame.residents).toHaveLength(14);
      expect(frame.residents.every((state) => everyFinite([
        ...state.position,
        state.rotationY,
        ...state.gazeTarget,
        ...Object.values(state.pose).flat(),
        ...state.propTransform,
      ]))).toBe(true);
      expect(worldMatrices(cast.root).flat().every(Number.isFinite)).toBe(true);
    }

    expect(scene.children).toContain(cast.root);
    cast.dispose();
    expect(scene.children).not.toContain(cast.root);
    world.dispose();
  });

  it('reconstructs exactly the same full cast frame after arbitrary seeks', () => {
    const scene = new Scene();
    const world = createWorld(scene, 111);
    const cast = createCast(world, 111);

    const firstFrame = cast.evaluateCast(83.125, 0.647);
    const firstMatrices = worldMatrices(cast.root);
    cast.evaluateCast(9.75, 0.075);
    const repeatedFrame = evaluateCast(cast, 83.125, 0.647);
    const repeatedMatrices = worldMatrices(cast.root);

    expect(repeatedFrame).toEqual(firstFrame);
    expect(repeatedMatrices).toEqual(firstMatrices);
    cast.dispose();
    world.dispose();
  });
});
