import { Group } from 'three';
import { clamp01, lerp, smootherstep, windowedProgress } from '../timeline/easing';
import type { WorldHandle } from '../world/World';
import { terrainHeightAt } from '../world/terrain';
import { transformTuple, type TransformTuple, type Vec3Tuple } from '../world/types';
import { createCharacterRig, type CharacterRig } from './CharacterRig';
import { interpolatePose, POSES, type Pose } from './poses';
import { createResidentSpecs, type ResidentSpec } from './residents';

export type CastResident = Readonly<{
  spec: ResidentSpec;
  rig: CharacterRig;
}>;

export type ResidentFrameState = Readonly<{
  id: string;
  position: Vec3Tuple;
  rotationY: number;
  gazeTarget: Vec3Tuple;
  pose: Pose;
  propTransform: TransformTuple;
}>;

export type CastFrame = Readonly<{
  time: number;
  narrativeProgress: number;
  residents: readonly ResidentFrameState[];
}>;

export type CastHandle = Readonly<{
  seed: number;
  root: Group;
  residents: readonly CastResident[];
  evaluateCast(time: number, narrativeProgress: number): CastFrame;
  dispose(): void;
}>;

export type CastBeatPosition = Readonly<{
  beatIndex: number;
  beatProgress: number;
}>;

export const CAST_SEMANTIC_BEAT_BOUNDARIES = Object.freeze([
  0,
  0.18,
  0.25,
  0.38,
  0.46,
  0.59,
  0.7,
  0.76,
  0.86,
  0.93,
  1,
] as const);

export function castSemanticProgress(position: CastBeatPosition): number {
  if (
    !Number.isInteger(position.beatIndex) ||
    position.beatIndex < 0 ||
    position.beatIndex >= CAST_SEMANTIC_BEAT_BOUNDARIES.length - 1 ||
    !Number.isFinite(position.beatProgress)
  ) {
    throw new RangeError('cast beat position must be finite and in range');
  }
  return lerp(
    CAST_SEMANTIC_BEAT_BOUNDARIES[position.beatIndex],
    CAST_SEMANTIC_BEAT_BOUNDARIES[position.beatIndex + 1],
    clamp01(position.beatProgress),
  );
}

function finitePosition(x: number, y: number, z: number): Vec3Tuple {
  const position = [x, y, z] as const;
  if (!position.every(Number.isFinite)) throw new RangeError('cast position must be finite');
  return Object.freeze(position);
}

function grounded(seed: number, x: number, z: number): Vec3Tuple {
  return finitePosition(x, terrainHeightAt(x, z, seed), z);
}

function blendPosition(from: Vec3Tuple, to: Vec3Tuple, progress: number): Vec3Tuple {
  const amount = clamp01(progress);
  return finitePosition(
    lerp(from[0], to[0], amount),
    lerp(from[1], to[1], amount),
    lerp(from[2], to[2], amount),
  );
}

function addGroundedOffset(seed: number, base: Vec3Tuple, x: number, z: number): Vec3Tuple {
  return grounded(seed, base[0] + x, base[2] + z);
}

function wrapAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

function blendAngle(from: number, to: number, progress: number): number {
  return from + wrapAngle(to - from) * clamp01(progress);
}

function faceTarget(from: Vec3Tuple, target: Vec3Tuple): number {
  return Math.atan2(target[0] - from[0], target[2] - from[2]);
}

function actionPulse(time: number, phase: number, speed = 1): number {
  return 0.36 + (0.5 - Math.cos(time * speed + phase) * 0.5) * 0.64;
}

function residentPhase(spec: ResidentSpec): number {
  return spec.phase / (Math.PI * 2);
}

function openingPose(spec: ResidentSpec, time: number): Pose {
  const speed = spec.openingPose === 'hammer' ? 2.55 : spec.openingPose === 'pullRibbon' ? 1.35 : 1.05;
  const pulse = actionPulse(time, spec.phase, speed);
  const weightedPulse = 0.46 + ((pulse - 0.36) / 0.64) * 0.54;
  const groundedWeight = spec.openingPose === 'pushCart' ? Math.max(0.64, weightedPulse) : weightedPulse;
  return interpolatePose(POSES.idle, POSES[spec.openingPose], groundedWeight);
}

function socialPose(spec: ResidentSpec, time: number): Pose {
  const base = POSES[spec.socialPose];
  const movement = spec.socialRole === 'older-skeptic' ? 0.82 : spec.socialRole === 'gossip' ? 0.92 : 0.7;
  return interpolatePose(POSES.listen, base, actionPulse(time, spec.phase * 0.73, movement));
}

function introductionPose(spec: ResidentSpec, time: number): Pose {
  if (spec.isHost) {
    const composure = 0.84 + actionPulse(time, spec.phase, 0.48) * 0.1;
    return interpolatePose(POSES.idle, POSES.present, composure);
  }
  const attention = 0.52 + residentPhase(spec) * 0.22;
  return interpolatePose(POSES.idle, POSES.listen, attention);
}

function portraitPose(spec: ResidentSpec): Pose {
  const phase = residentPhase(spec);
  if (spec.isHost) return POSES.idle;
  if (spec.socialRole === 'older-skeptic') {
    return interpolatePose(POSES.idle, POSES.elderLean, 0.58 + phase * 0.06);
  }
  if (spec.socialRole === 'gossip') {
    return interpolatePose(POSES.idle, POSES.gossip, 0.2 + phase * 0.1);
  }
  if (spec.socialPose === 'point') {
    return interpolatePose(POSES.idle, POSES.point, 0.15 + phase * 0.08);
  }
  return interpolatePose(POSES.idle, POSES.listen, 0.34 + phase * 0.12);
}

function judgmentTarget(spec: ResidentSpec): Pose {
  if (spec.isHost) return POSES.carryCrate;
  if (spec.socialRole === 'older-skeptic') return POSES.elderLean;
  return POSES[spec.socialPose];
}

function judgmentPose(spec: ResidentSpec, progress: number): Pose {
  const portrait = portraitPose(spec);
  if (spec.isHost) return POSES.carryCrate;
  const phaseDelay = residentPhase(spec) * 0.008;
  const roleDelay = spec.socialRole === 'older-skeptic'
    ? 0.03
    : spec.socialRole === 'gossip'
      ? 0.008
      : spec.socialPose === 'point'
        ? 0
        : 0.014;
  const arrival = smootherstep(windowedProgress(
    progress,
    0.76 + roleDelay + phaseDelay,
    0.82 + roleDelay + phaseDelay,
  ));
  return interpolatePose(portrait, judgmentTarget(spec), arrival);
}

function finalTableauPose(spec: ResidentSpec): Pose {
  const phase = residentPhase(spec);
  if (spec.isHost) return interpolatePose(POSES.finalStillness, POSES.present, 0.68);
  if (spec.socialRole === 'older-skeptic') {
    return interpolatePose(POSES.finalStillness, POSES.elderLean, 0.8 + phase * 0.12);
  }
  if (spec.socialPose === 'point') {
    return interpolatePose(POSES.recoil, POSES.point, 0.74 + phase * 0.14);
  }
  if (spec.socialRole === 'gossip') {
    return interpolatePose(POSES.finalStillness, POSES.recoil, 0.76 + phase * 0.14);
  }
  if (spec.socialPose === 'headShake') {
    return interpolatePose(POSES.recoil, POSES.headShake, 0.58 + phase * 0.16);
  }
  return interpolatePose(POSES.finalStillness, POSES.recoil, 0.52 + phase * 0.2);
}

function warningPose(spec: ResidentSpec, judgment: Pose, progress: number): Pose {
  const phaseDelay = residentPhase(spec) * 0.006;
  const roleDelay = spec.isHost
    ? 0.006
    : spec.socialRole === 'older-skeptic'
      ? 0.022
      : spec.socialRole === 'gossip'
        ? 0.008
        : spec.socialPose === 'point'
          ? 0
          : 0.014;
  const reaction = smootherstep(windowedProgress(
    progress,
    0.86 + roleDelay + phaseDelay,
    0.905 + roleDelay + phaseDelay,
  ));
  return interpolatePose(judgment, finalTableauPose(spec), reaction);
}

function poseAt(spec: ResidentSpec, time: number, progress: number): Pose {
  const preparation = openingPose(spec, time);
  const peculiar = introductionPose(spec, time);
  const rumor = socialPose(spec, time);
  const portrait = portraitPose(spec);
  const vigor = spec.isHost ? POSES.carryCrate : portrait;
  const judgment = judgmentPose(spec, progress);

  if (progress < 0.18) return preparation;
  if (progress < 0.25) return interpolatePose(preparation, peculiar, smootherstep(windowedProgress(progress, 0.18, 0.25)));
  if (progress < 0.38) return peculiar;
  if (progress < 0.46) return interpolatePose(peculiar, rumor, smootherstep(windowedProgress(progress, 0.38, 0.46)));
  if (progress < 0.59) return rumor;
  if (progress < 0.635) return interpolatePose(rumor, portrait, smootherstep(windowedProgress(progress, 0.59, 0.635)));
  if (progress < 0.7) return portrait;
  if (progress < 0.76) return interpolatePose(portrait, vigor, smootherstep(windowedProgress(progress, 0.7, 0.76)));
  if (progress < 0.86) return judgment;
  if (progress < 0.93) return warningPose(spec, judgment, progress);
  return finalTableauPose(spec);
}

function preparationRootOffset(spec: ResidentSpec, time: number, progress: number): readonly [number, number] {
  const activity = 1 - smootherstep(windowedProgress(progress, 0.14, 0.22));
  if (spec.openingPose === 'pushCart') {
    const travel = Math.sin(time * 0.48 + spec.phase) * 0.34 * activity;
    return [travel * 0.58, travel];
  }
  if (spec.openingPose === 'walk' || spec.openingPose === 'carryTray') {
    const travel = Math.sin(time * 0.42 + spec.phase) * 0.28 * activity;
    return [travel, travel * 0.22];
  }
  if (spec.openingPose === 'pullRibbon') {
    return [Math.sin(time * 0.7 + spec.phase) * 0.09 * activity, Math.cos(time * 0.6 + spec.phase) * 0.07 * activity];
  }
  return [0, 0];
}

function socialPosition(spec: ResidentSpec, world: WorldHandle): Vec3Tuple {
  if (spec.socialRole === 'gossip') {
    const side = spec.id === 'sela-briar' ? -1 : 1;
    return addGroundedOffset(world.seed, world.anchors.crowd, side * 0.72, 3.05 + side * 0.12);
  }
  if (spec.socialRole === 'older-skeptic') {
    const side = spec.id === 'moss-amber' ? -1 : 1;
    return addGroundedOffset(world.seed, world.anchors.crowd, side * 1.2, -2.55);
  }
  return spec.position;
}

function positionAt(spec: ResidentSpec, world: WorldHandle, time: number, progress: number): Vec3Tuple {
  const offset = preparationRootOffset(spec, time, progress);
  let current = addGroundedOffset(world.seed, spec.position, offset[0], offset[1]);

  if (spec.isHost) {
    const crossing = addGroundedOffset(world.seed, world.anchors.crowd, -0.9, -2.15);
    current = blendPosition(current, crossing, smootherstep(windowedProgress(progress, 0.16, 0.29)));
  } else if (spec.socialRole === 'gossip' || spec.socialRole === 'older-skeptic') {
    current = blendPosition(current, socialPosition(spec, world), smootherstep(windowedProgress(progress, 0.38, 0.48)));
  }

  const crowdStart = spec.isHost
    ? grounded(world.seed, world.anchors.crowd[0], world.anchors.crowd[2])
    : spec.crowdPosition;
  current = blendPosition(current, crowdStart, smootherstep(windowedProgress(progress, 0.74, 0.84)));

  if (spec.isHost) {
    const warning = grounded(world.seed, world.anchors.warning[0], world.anchors.warning[2]);
    current = blendPosition(current, warning, smootherstep(windowedProgress(progress, 0.88, 0.96)));
  }
  return current;
}

function gazeAt(spec: ResidentSpec, world: WorldHandle, progress: number, position: Vec3Tuple): Vec3Tuple {
  const headHeight = spec.proportions.height * 0.78;
  if (progress >= 0.9) return finitePosition(world.anchors.doorway[0], world.anchors.doorway[1], world.anchors.doorway[2]);
  if (progress >= 0.7) {
    const hostTarget = progress >= 0.88 ? world.anchors.warning : world.anchors.crowd;
    return finitePosition(hostTarget[0], hostTarget[1] + 1.1, hostTarget[2]);
  }
  if (progress >= 0.4 && (spec.socialRole === 'gossip' || spec.socialRole === 'older-skeptic')) {
    return finitePosition(world.anchors.crowd[0], world.anchors.crowd[1] + 1.3, world.anchors.crowd[2] + (spec.socialRole === 'gossip' ? 2.9 : -1.2));
  }
  if (spec.vignette === 'invitation-posting') return world.anchors.invitation;
  if (spec.vignette === 'flower-gathering') return finitePosition(position[0] + 0.45, position[1] + 0.25, position[2] + 0.35);
  if (spec.vignette === 'carpenter') return finitePosition(4.8, position[1] + 2.4, -8.5);
  if (spec.vignette === 'cart-team') return finitePosition(world.anchors.cart[0], world.anchors.cart[1] + 0.9, world.anchors.cart[2]);
  if (spec.vignette === 'ribbon-children') return finitePosition(world.anchors.party[0] - 1.8, world.anchors.party[1] + 1.1, world.anchors.party[2]);
  return finitePosition(position[0] + Math.sin(spec.phase) * 1.4, position[1] + headHeight, position[2] + Math.cos(spec.phase) * 1.4);
}

function propTransformAt(spec: ResidentSpec, time: number, progress: number): TransformTuple {
  const stillness = 1 - smootherstep(windowedProgress(progress, 0.84, 0.94));
  const pulse = Math.sin(time * 1.1 + spec.phase) * stillness;
  const amplitude = spec.prop === 'hammer' ? 0.07 : spec.prop === 'ribbon' ? 0.055 : 0.018;
  return transformTuple(0, pulse * amplitude * 0.35, 0, pulse * amplitude, 0, pulse * amplitude * 0.3, 1, 1, 1);
}

function updateHostProps(rig: CharacterRig, progress: number): void {
  rig.propRoot.traverse((object) => {
    if (object.userData.hostPhase === 'invitation') object.visible = progress < 0.28;
    if (object.userData.hostPhase === 'crate') object.visible = progress >= 0.67 && progress < 0.9;
  });
}

function applyState(resident: CastResident, state: ResidentFrameState, progress: number): void {
  const { root, propRoot } = resident.rig;
  root.position.set(...state.position);
  root.rotation.set(0, state.rotationY, 0);
  resident.rig.applyPose(state.pose);
  resident.rig.gazeAt(state.gazeTarget);
  propRoot.position.set(state.propTransform[0], state.propTransform[1], state.propTransform[2]);
  propRoot.rotation.set(state.propTransform[3], state.propTransform[4], state.propTransform[5]);
  propRoot.scale.set(state.propTransform[6], state.propTransform[7], state.propTransform[8]);
  if (resident.spec.isHost) updateHostProps(resident.rig, progress);
}

function stateFor(spec: ResidentSpec, world: WorldHandle, time: number, progress: number): ResidentFrameState {
  const position = positionAt(spec, world, time, progress);
  const gazeTarget = gazeAt(spec, world, progress, position);
  const crowdRotation = faceTarget(position, progress >= 0.88 && spec.isHost ? world.anchors.doorway : world.anchors.crowd);
  const crowdBlend = smootherstep(windowedProgress(progress, 0.72, 0.84));
  const rotationY = blendAngle(spec.rotationY, crowdRotation, crowdBlend);
  const state: ResidentFrameState = {
    id: spec.id,
    position,
    rotationY,
    gazeTarget,
    pose: poseAt(spec, time, progress),
    propTransform: propTransformAt(spec, time, progress),
  };
  return Object.freeze(state);
}

export function createCast(world: WorldHandle, seed = world.seed): CastHandle {
  if (!Number.isFinite(seed)) throw new RangeError('cast seed must be finite');
  const root = new Group();
  root.name = 'cast:lantern-hill-residents';
  const specs = createResidentSpecs(seed, world.anchors);
  const residents = Object.freeze(specs.map((spec): CastResident => {
    const rig = createCharacterRig(spec);
    rig.root.name = spec.isHost ? `cast:host:${spec.id}` : `cast:resident:${spec.id}`;
    root.add(rig.root);
    return Object.freeze({ spec, rig });
  }));

  const parent = world.root.parent ?? world.root;
  parent.add(root);
  let disposed = false;

  const evaluate = (time: number, narrativeProgress: number): CastFrame => {
    if (disposed) throw new Error('cannot evaluate a disposed cast');
    if (!Number.isFinite(time) || !Number.isFinite(narrativeProgress)) throw new RangeError('cast time and progress must be finite');
    const progress = clamp01(narrativeProgress);
    const states = Object.freeze(residents.map((resident) => {
      const state = stateFor(resident.spec, world, time, progress);
      applyState(resident, state, progress);
      return state;
    }));
    return Object.freeze({ time, narrativeProgress: progress, residents: states });
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    residents.forEach((resident) => resident.rig.dispose());
    root.removeFromParent();
    root.clear();
  };

  const handle: CastHandle = Object.freeze({ seed, root, residents, evaluateCast: evaluate, dispose });
  evaluate(0, 0);
  return handle;
}

export function evaluateCast(cast: CastHandle, time: number, narrativeProgress: number): CastFrame {
  return cast.evaluateCast(time, narrativeProgress);
}
