import { CatmullRomCurve3, Vector3 } from 'three';
import {
  buildNarrativeBeats,
  NARRATIVE_BEAT_NAMES,
  type NarrativeBeatName,
} from '../timeline/beatTable';
import { deriveCues } from '../timeline/deriveCues';
import { clamp01, lerp, smootherstep } from '../timeline/easing';
import type { NarrativeCue } from '../timeline/types';
import {
  createWorldAnchors,
  type WorldAnchorName,
  type WorldAnchors,
} from '../world/anchors';
import { terrainHeightAt } from '../world/terrain';
import type { Vec3Tuple } from '../world/types';

export const SHOT_BEAT_NAMES = NARRATIVE_BEAT_NAMES;

export type ShotBeatName = NarrativeBeatName;

export type ShotTrack = Readonly<{
  index: number;
  name: ShotBeatName;
  start: number;
  end: number;
  progressStart: number;
  progressEnd: number;
  blendDuration: number;
  positionPoints: readonly Vec3Tuple[];
  targetPoints: readonly Vec3Tuple[];
  fovStart: number;
  fovEnd: number;
}>;

export type ShotPlan = Readonly<{
  duration: number;
  seed: number;
  near: number;
  far: number;
  minimumClearance: number;
  anchors: WorldAnchors;
  shots: readonly ShotTrack[];
}>;

export type CameraPose = Readonly<{
  time: number;
  progress: number;
  beat: ShotBeatName;
  beatIndex: number;
  beatProgress: number;
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov: number;
  near: number;
  far: number;
  microDrift: number;
}>;

const FOV_KEYFRAMES = Object.freeze([
  44,
  42,
  40,
  38,
  42,
  38,
  42,
  39,
  36,
  37,
  39,
] as const);

const BLEND_DURATIONS = Object.freeze([
  1.4,
  1.2,
  1.1,
  1.3,
  1.5,
  1.4,
  1.1,
  1.2,
  1.6,
  1.2,
] as const);

type Offset = readonly [x: number, y: number, z: number];

type PathBlueprint = Readonly<{
  anchor: WorldAnchorName;
  offset: Offset;
}>;

const POSITION_BOUNDARIES: readonly PathBlueprint[] = Object.freeze([
  { anchor: 'doorway', offset: [-11, 9, 16] },
  { anchor: 'doorway', offset: [-7, 6.6, 12] },
  { anchor: 'party', offset: [2, 7.3, 14] },
  { anchor: 'doorway', offset: [-2, 6, 12] },
  { anchor: 'bridge', offset: [4, 6, 10] },
  { anchor: 'warning', offset: [0, 5, 14] },
  { anchor: 'doorway', offset: [4, 8, 13] },
  { anchor: 'party', offset: [-6, 7, 13] },
  { anchor: 'crowd', offset: [0, 6, 15] },
  { anchor: 'warning', offset: [-4, 5.3, 13] },
  { anchor: 'warning', offset: [-8, 8.8, 15.5] },
]);

const TARGET_BOUNDARIES: readonly PathBlueprint[] = Object.freeze([
  { anchor: 'crowd', offset: [0, 2.2, 0] },
  { anchor: 'invitation', offset: [0, 0.1, 0] },
  { anchor: 'party', offset: [0, 1.4, 0] },
  { anchor: 'doorway', offset: [0, 0.4, 0] },
  { anchor: 'bridge', offset: [1.5, 1, -1.5] },
  { anchor: 'warning', offset: [0, 1.2, 0] },
  { anchor: 'doorway', offset: [0, 0.4, 0] },
  { anchor: 'party', offset: [0, 1.2, 0] },
  { anchor: 'warning', offset: [0, 3.35, 3.3] },
  { anchor: 'warning', offset: [0, 1.25, 0] },
  { anchor: 'warning', offset: [0.12, 0.67, 1.04] },
]);

const POSITION_BENDS: readonly Offset[] = Object.freeze([
  [1, 0.4, -0.8],
  [0.8, 0.25, 1],
  [0.2, 0.2, 0.5],
  [-1, 0.4, 1],
  [0.5, 0.4, -0.6],
  [0.7, 0.35, 0.8],
  [-0.5, 0.3, 0.7],
  [0.6, 0.25, -0.6],
  [-0.8, 0.4, -0.4],
  [0.4, 0.15, -0.6],
]);

function tuple(values: readonly number[]): Vec3Tuple {
  if (values.length !== 3 || !values.every(Number.isFinite)) {
    throw new RangeError('camera vectors must contain three finite values');
  }
  return Object.freeze([values[0], values[1], values[2]] as const);
}

function place(anchors: WorldAnchors, blueprint: PathBlueprint): Vec3Tuple {
  const anchor = anchors[blueprint.anchor];
  return tuple([
    anchor[0] + blueprint.offset[0],
    anchor[1] + blueprint.offset[1],
    anchor[2] + blueprint.offset[2],
  ]);
}

function interpolateTuple(
  start: Vec3Tuple,
  end: Vec3Tuple,
  progress: number,
  bend: Offset = [0, 0, 0],
): Vec3Tuple {
  return tuple([
    lerp(start[0], end[0], progress) + bend[0],
    lerp(start[1], end[1], progress) + bend[1],
    lerp(start[2], end[2], progress) + bend[2],
  ]);
}

function makeCurvePoints(
  start: Vec3Tuple,
  end: Vec3Tuple,
  bend: Offset,
): readonly Vec3Tuple[] {
  return Object.freeze([
    start,
    interpolateTuple(start, end, 0.34, bend),
    interpolateTuple(start, end, 0.68, [
      -bend[0] * 0.45,
      bend[1] * 0.55,
      -bend[2] * 0.45,
    ]),
    end,
  ]);
}

function makeTargetPoints(
  start: Vec3Tuple,
  end: Vec3Tuple,
): readonly Vec3Tuple[] {
  return Object.freeze([
    start,
    interpolateTuple(start, end, 0.28),
    interpolateTuple(start, end, 0.74),
    end,
  ]);
}

function validateDuration(duration: number): void {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError('shot plan duration must be positive and finite');
  }
}

export function buildShotPlan(
  duration: number,
  anchors: WorldAnchors = createWorldAnchors(111),
  seed = 111,
  cues?: readonly NarrativeCue[],
): ShotPlan {
  validateDuration(duration);
  if (!Number.isFinite(seed)) throw new RangeError('camera seed must be finite');

  const positionBoundaries = POSITION_BOUNDARIES.map((value) =>
    place(anchors, value),
  );
  const targetBoundaries = TARGET_BOUNDARIES.map((value) =>
    place(anchors, value),
  );
  const beats = buildNarrativeBeats(cues ?? deriveCues(duration), duration);
  const shots = beats.map((beat, index): ShotTrack => {
    return Object.freeze({
      index,
      name: beat.name,
      start: beat.start,
      end: beat.end,
      progressStart: beat.progressStart,
      progressEnd: beat.progressEnd,
      blendDuration: BLEND_DURATIONS[index],
      positionPoints: makeCurvePoints(
        positionBoundaries[index],
        positionBoundaries[index + 1],
        POSITION_BENDS[index],
      ),
      targetPoints: makeTargetPoints(
        targetBoundaries[index],
        targetBoundaries[index + 1],
      ),
      fovStart: FOV_KEYFRAMES[index],
      fovEnd: FOV_KEYFRAMES[index + 1],
    });
  });

  return Object.freeze({
    duration,
    seed,
    near: 0.12,
    far: 180,
    minimumClearance: 0.65,
    anchors,
    shots: Object.freeze(shots),
  });
}

const CATMULL_ROM_KNOTS = Object.freeze([1 / 3, 2 / 3] as const);
const KNOT_BLEND_RADIUS = 0.15;

function curveAt(points: readonly Vec3Tuple[], progress: number): Vector3 {
  const vectors = points.map((point) => new Vector3(...point));
  const curveProgress = smootherstep(progress);
  const centripetal = new CatmullRomCurve3(
    vectors,
    false,
    'centripetal',
    0.5,
  );
  const point = centripetal.getPoint(curveProgress);
  const knotDistance = Math.min(
    ...CATMULL_ROM_KNOTS.map((knot) => Math.abs(curveProgress - knot)),
  );

  if (knotDistance >= KNOT_BLEND_RADIUS) return point;

  const uniform = new CatmullRomCurve3(
    vectors,
    false,
    'catmullrom',
    0.5,
  );
  const blend = smootherstep(1 - knotDistance / KNOT_BLEND_RADIUS);
  return point.lerp(uniform.getPoint(curveProgress), blend);
}

type RawPose = Readonly<{
  position: Vector3;
  target: Vector3;
  fov: number;
  microDrift: number;
}>;

function evaluateTrack(track: ShotTrack, time: number): RawPose {
  const length = track.end - track.start;
  const local = length > 0 ? clamp01((time - track.start) / length) : 1;
  const position = curveAt(track.positionPoints, local);
  const target = curveAt(track.targetPoints, local);
  const driftEnvelope = Math.sin(Math.PI * local);
  const drift = new Vector3(
    Math.sin(time * 0.37 + track.index * 0.91) * 0.011,
    Math.sin(time * 0.23 + track.index * 1.73) * 0.005,
    Math.cos(time * 0.31 + track.index * 1.19) * 0.01,
  ).multiplyScalar(driftEnvelope);
  position.add(drift);

  return Object.freeze({
    position,
    target,
    fov: lerp(track.fovStart, track.fovEnd, smootherstep(local)),
    microDrift: drift.length(),
  });
}

function blendPose(left: RawPose, right: RawPose, progress: number): RawPose {
  const eased = smootherstep(progress);
  return Object.freeze({
    position: left.position.clone().lerp(right.position, eased),
    target: left.target.clone().lerp(right.target, eased),
    fov: lerp(left.fov, right.fov, eased),
    microDrift: lerp(left.microDrift, right.microDrift, eased),
  });
}

function activeShot(plan: ShotPlan, time: number): ShotTrack {
  return (
    plan.shots.find(
      (shot, index) =>
        time >= shot.start &&
        (time < shot.end || index === plan.shots.length - 1),
    ) ?? plan.shots[0]
  );
}

function blendedTrackPose(plan: ShotPlan, time: number): RawPose {
  for (let index = 1; index < plan.shots.length; index += 1) {
    const left = plan.shots[index - 1];
    const right = plan.shots[index];
    const blendDuration = Math.min(left.blendDuration, right.blendDuration);
    const halfBlend = blendDuration / 2;
    if (time >= right.start - halfBlend && time <= right.start + halfBlend) {
      return blendPose(
        evaluateTrack(left, time),
        evaluateTrack(right, time),
        (time - (right.start - halfBlend)) / blendDuration,
      );
    }
  }
  return evaluateTrack(activeShot(plan, time), time);
}

export function evaluateShotPlan(plan: ShotPlan, time: number): CameraPose {
  if (!Number.isFinite(time)) throw new RangeError('camera time must be finite');
  const safeTime = Math.min(plan.duration, Math.max(0, time));
  const shot = activeShot(plan, safeTime);
  const raw = blendedTrackPose(plan, safeTime);
  const ground = terrainHeightAt(raw.position.x, raw.position.z, plan.seed);
  raw.position.y = Math.max(
    raw.position.y,
    ground + plan.minimumClearance,
  );
  const targetDistance = raw.position.distanceTo(raw.target);
  if (targetDistance <= plan.near * 2) {
    raw.target.z -= plan.near * 2 - targetDistance + 0.01;
  }
  const length = shot.end - shot.start;

  return Object.freeze({
    time: safeTime,
    progress: safeTime / plan.duration,
    beat: shot.name,
    beatIndex: shot.index,
    beatProgress:
      length > 0 ? clamp01((safeTime - shot.start) / length) : 1,
    position: tuple(raw.position.toArray()),
    target: tuple(raw.target.toArray()),
    fov: Math.min(55, Math.max(28, raw.fov)),
    near: plan.near,
    far: Math.max(plan.far, targetDistance + 24),
    microDrift: raw.microDrift,
  });
}
