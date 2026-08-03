import { Box3, Mesh, PerspectiveCamera, Raycaster, Scene, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CinematicCamera } from '../../src/camera/CinematicCamera';
import {
  SHOT_BEAT_NAMES,
  buildShotPlan,
  evaluateShotPlan,
} from '../../src/camera/shotPlan';
import { deriveCues } from '../../src/timeline/deriveCues';
import { smootherstep } from '../../src/timeline/easing';
import { buildNarrativeBeats } from '../../src/timeline/NarrativeDirector';
import { createWorldAnchors } from '../../src/world/anchors';
import { createWorld, type WorldHandle } from '../../src/world/World';
import { terrainHeightAt } from '../../src/world/terrain';

const APPROVED_CAMERA_POSES = Object.freeze([
  { time: 1, position: [-10.371834283614502, 16.736673823229314, 10.877352148715172], target: [3.1919958612602257, 8.663443948834807, -1.11351098619274], fov: 43.99236634138889 },
  { time: 20, position: [10.595013582953019, 13.10488038777871, 9.798635347738596], target: [8.59698341352356, 7.204148097413208, -4.200339365978599], fov: 39.99910204366786 },
  { time: 55, position: [0.2992127842848327, 11.07482920629, 6.300175419850008], target: [0.2996332430792789, 7.274643145042745, -7.699480161929761], fov: 38.00016355219799 },
  { time: 100, position: [3.1798347015024473, 12.47395332399641, 13.84884134768319], target: [0.3808121887673209, 9.401167009794827, -4.398052718342956], fov: 36.03764090127185 },
  { time: 103, position: [2.9107623725155345, 12.471060142922108, 13.591175759136311], target: [0.3, 9.371549050215586, -4.483583115226834], fov: 36.03046501767924 },
  { time: 110.5, position: [-7.684600020309841, 14.857400121776191, 7.792814600342699], target: [0.41948619799269127, 6.747221681728593, -6.664452950730007], fov: 38.98899601642741 },
] as const);

function inverseSmootherstep(target: number): number {
  let lower = 0;
  let upper = 1;
  for (let index = 0; index < 80; index += 1) {
    const middle = (lower + upper) / 2;
    if (smootherstep(middle) < target) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

function internalKnotTimes(plan: ReturnType<typeof buildShotPlan>): readonly number[] {
  return plan.shots.flatMap((shot) => [1 / 3, 2 / 3].map((knot) => {
    const local = inverseSmootherstep(knot);
    return shot.start + (shot.end - shot.start) * local;
  }));
}

function oneSidedVelocityJump(
  plan: ReturnType<typeof buildShotPlan>,
  time: number,
  interval: number,
  key: 'position' | 'target',
): number {
  const before = new Vector3(...evaluateShotPlan(plan, time - interval)[key]);
  const at = new Vector3(...evaluateShotPlan(plan, time)[key]);
  const after = new Vector3(...evaluateShotPlan(plan, time + interval)[key]);
  const incoming = at.clone().sub(before).divideScalar(interval);
  const outgoing = after.sub(at).divideScalar(interval);
  return incoming.distanceTo(outgoing);
}

function knotAcceleration(
  plan: ReturnType<typeof buildShotPlan>,
  time: number,
  sampleRate: number,
  key: 'position' | 'target',
): number {
  const interval = 1 / sampleRate;
  const before = new Vector3(...evaluateShotPlan(plan, time - interval)[key]);
  const at = new Vector3(...evaluateShotPlan(plan, time)[key]);
  const after = new Vector3(...evaluateShotPlan(plan, time + interval)[key]);
  return after.addScaledVector(at, -2).add(before).length() / (interval * interval);
}

describe('ten-beat cinematic shot plan', () => {
  it('shares every measured phrase boundary with the narrative director', () => {
    const duration = 110.8;
    const cues = deriveCues(duration);
    const narrativeBoundaries = buildNarrativeBeats(cues, duration).map(
      ({ name, start, end }) => ({ name, start, end }),
    );
    const cameraBoundaries = buildShotPlan(duration).shots.map(
      ({ name, start, end }) => ({ name, start, end }),
    );

    expect(cameraBoundaries).toEqual(narrativeBoundaries);
  });

  it('covers the complete duration exactly with ten authored beats', () => {
    const plan = buildShotPlan(130, createWorldAnchors(111));

    expect(plan.shots.map((shot) => shot.name)).toEqual(SHOT_BEAT_NAMES);
    expect(plan.shots).toHaveLength(10);
    expect(plan.shots[0].start).toBe(0);
    expect(plan.shots.at(-1)?.end).toBe(130);
    expect(
      plan.shots.every(
        (shot, index) => index === 0 || shot.start === plan.shots[index - 1].end,
      ),
    ).toBe(true);
    expect(plan.shots.every((shot) => shot.blendDuration >= 0.8 && shot.blendDuration <= 1.6)).toBe(true);
  });

  it('never produces invalid, terrain-clipped, or unsafe camera poses', () => {
    const plan = buildShotPlan(130, createWorldAnchors(111));

    for (let time = -1; time <= 131; time += 0.25) {
      const pose = evaluateShotPlan(plan, time);
      const targetDistance = new Vector3(...pose.position).distanceTo(
        new Vector3(...pose.target),
      );

      expect(
        [...pose.position, ...pose.target, pose.fov, pose.near, pose.far].every(
          Number.isFinite,
        ),
      ).toBe(true);
      expect(pose.position[1]).toBeGreaterThanOrEqual(
        terrainHeightAt(pose.position[0], pose.position[2], 111) +
          plan.minimumClearance,
      );
      expect(pose.fov).toBeGreaterThanOrEqual(28);
      expect(pose.fov).toBeLessThanOrEqual(55);
      expect(pose.near).toBeGreaterThan(0);
      expect(targetDistance).toBeGreaterThan(pose.near * 2);
      expect(pose.far).toBeGreaterThan(targetDistance + 20);
      expect(pose.microDrift).toBeLessThan(0.03);
    }
  });

  it('uses smooth deterministic handoffs instead of discontinuous cuts', () => {
    const plan = buildShotPlan(130);

    for (const boundary of plan.shots.slice(1).map((shot) => shot.start)) {
      const before = evaluateShotPlan(plan, boundary - 0.01);
      const at = evaluateShotPlan(plan, boundary);
      const after = evaluateShotPlan(plan, boundary + 0.01);
      const beforePosition = new Vector3(...before.position);
      const atPosition = new Vector3(...at.position);
      const afterPosition = new Vector3(...after.position);
      const beforeTarget = new Vector3(...before.target);
      const atTarget = new Vector3(...at.target);
      const afterTarget = new Vector3(...after.target);

      expect(beforePosition.distanceTo(atPosition)).toBeLessThan(0.08);
      expect(atPosition.distanceTo(afterPosition)).toBeLessThan(0.08);
      expect(beforeTarget.distanceTo(atTarget)).toBeLessThan(0.08);
      expect(atTarget.distanceTo(afterTarget)).toBeLessThan(0.08);
      expect(Math.abs(before.fov - at.fov)).toBeLessThan(0.02);
      expect(Math.abs(at.fov - after.fov)).toBeLessThan(0.02);
      expect(
        beforeTarget.clone().sub(beforePosition).angleTo(atTarget.clone().sub(atPosition)) * 180 / Math.PI,
      ).toBeLessThan(0.02);
      expect(
        atTarget.clone().sub(atPosition).angleTo(afterTarget.clone().sub(afterPosition)) * 180 / Math.PI,
      ).toBeLessThan(0.02);
      expect(evaluateShotPlan(plan, boundary)).toEqual(at);
    }
  });

  it('matches one-sided position and target velocities at every internal curve knot', () => {
    const plan = buildShotPlan(110.8);
    const interval = 1 / 960;
    const knots = internalKnotTimes(plan);
    const worstPositionJump = Math.max(...knots.map((time) =>
      oneSidedVelocityJump(plan, time, interval, 'position')));
    const worstTargetJump = Math.max(...knots.map((time) =>
      oneSidedVelocityJump(plan, time, interval, 'target')));

    expect(worstPositionJump, 'worst one-sided position velocity jump').toBeLessThan(0.02);
    expect(worstTargetJump, 'worst one-sided target velocity jump').toBeLessThan(0.01);
  });

  it('keeps knot acceleration bounded as sampling resolution increases', () => {
    const plan = buildShotPlan(110.8);
    const knots = internalKnotTimes(plan);
    const worst = (sampleRate: number, key: 'position' | 'target') => Math.max(
      ...knots.map((time) => knotAcceleration(plan, time, sampleRate, key)),
    );
    const position120Hz = worst(120, 'position');
    const position960Hz = worst(960, 'position');
    const target120Hz = worst(120, 'target');
    const target960Hz = worst(960, 'target');

    expect(position120Hz, '120Hz position acceleration').toBeLessThan(13);
    expect(position960Hz, '960Hz position acceleration').toBeLessThan(13);
    expect(target120Hz, '120Hz target acceleration').toBeLessThan(5);
    expect(target960Hz, '960Hz target acceleration').toBeLessThan(5);
  });

  it('preserves every approved focal pose bit-for-bit', () => {
    const plan = buildShotPlan(110.8);

    for (const expected of APPROVED_CAMERA_POSES) {
      const pose = evaluateShotPlan(plan, expected.time);
      expect(pose.position, `${expected.time}s position`).toEqual(expected.position);
      expect(pose.target, `${expected.time}s target`).toEqual(expected.target);
      expect(pose.fov, `${expected.time}s FOV`).toBe(expected.fov);
    }
  });
});

describe('CinematicCamera', () => {
  it('applies a complete pose to a perspective camera and lands on the final frame', () => {
    const camera = new PerspectiveCamera();
    const controller = new CinematicCamera(camera, buildShotPlan(130));
    const pose = controller.evaluate(130);

    expect(pose.beat).toBe('doorway-shadow-hold');
    expect(camera.position.toArray()).toEqual([...pose.position]);
    expect(camera.fov).toBe(pose.fov);
    expect(camera.near).toBe(pose.near);
    expect(camera.far).toBe(pose.far);
    expect(controller.target.toArray()).toEqual([...pose.target]);
  });
});

describe('authored checkpoint framing', () => {
  const duration = 110.8;
  let world: WorldHandle;
  let plan: ReturnType<typeof buildShotPlan>;
  let architectureMeshes: Mesh[];
  let homeBounds: Box3[];

  beforeAll(() => {
    world = createWorld(new Scene(), 111);
    plan = buildShotPlan(duration, world.anchors, 111, deriveCues(duration));
    world.root.updateMatrixWorld(true);
    architectureMeshes = [];
    homeBounds = world.graph.homes.map((home) => {
      const root = world.root.getObjectByName(
        `architecture:${home.detail}:${home.name}`,
      );
      if (!root) throw new Error(`missing architecture for ${home.name}`);
      root.traverse((object) => {
        if (object instanceof Mesh) architectureMeshes.push(object);
      });
      return new Box3().setFromObject(root);
    });
  });

  afterAll(() => { world.dispose(); });

  it.each([
    { time: 1, minDistance: 16, maxDistance: 24, maxFov: 47, minTargetClearance: 0.5 },
    { time: 20, minDistance: 10, maxDistance: 18, maxFov: 44, minTargetClearance: 0.5 },
    { time: 55, minDistance: 12, maxDistance: 22, maxFov: 44, minTargetClearance: 0.6 },
    { time: 100, minDistance: 13, maxDistance: 21, maxFov: 44, minTargetClearance: 0.5 },
    { time: 110.5, minDistance: 13, maxDistance: 20, maxFov: 40, minTargetClearance: 0.3 },
  ])('keeps the $time second composition clear of homes and legibly scaled', ({
    time,
    minDistance,
    maxDistance,
    maxFov,
    minTargetClearance,
  }) => {
    const pose = evaluateShotPlan(plan, time);
    const position = new Vector3(...pose.position);
    const target = new Vector3(...pose.target);
    const sightline = target.clone().sub(position);
    const targetDistance = sightline.length();
    const hit = new Raycaster(
      position,
      sightline.clone().normalize(),
      0,
      targetDistance,
    ).intersectObjects(architectureMeshes, false)[0];
    const architectureClearance = Math.min(
      ...homeBounds.map((bounds) => bounds.distanceToPoint(position)),
    );
    const sightlineClearFraction = hit ? hit.distance / targetDistance : 1;
    const terrainClearance = position.y
      - terrainHeightAt(position.x, position.z, 111);
    const targetClearance = target.y
      - terrainHeightAt(target.x, target.z, 111);

    expect(architectureClearance, `${time}s architecture clearance`).toBeGreaterThanOrEqual(4);
    expect(sightlineClearFraction, `${time}s unobstructed sightline fraction`).toBeGreaterThanOrEqual(0.7);
    expect(terrainClearance, `${time}s terrain clearance`).toBeGreaterThanOrEqual(2);
    expect(targetClearance, `${time}s target above terrain`).toBeGreaterThanOrEqual(minTargetClearance);
    expect(targetDistance, `${time}s target distance lower bound`).toBeGreaterThanOrEqual(minDistance);
    expect(targetDistance, `${time}s target distance upper bound`).toBeLessThanOrEqual(maxDistance);
    expect(pose.fov, `${time}s field of view`).toBeLessThanOrEqual(maxFov);
  });

  it('makes the warning motif the dominant climax focal point', () => {
    const pose = evaluateShotPlan(plan, 100);
    const position = new Vector3(...pose.position);
    const target = new Vector3(...pose.target);
    const warningHalo = new Vector3(...world.anchors.warning).add(
      new Vector3(0, 3.35, 3.3),
    );

    expect(
      target.distanceTo(warningHalo),
      '100s target distance from warning halo',
    ).toBeLessThanOrEqual(1);
    expect(
      pose.fov,
      '100s focal field of view lower bound',
    ).toBeGreaterThanOrEqual(35);
    expect(
      pose.fov,
      '100s focal field of view upper bound',
    ).toBeLessThanOrEqual(37);
    expect(
      position.distanceTo(target),
      '100s focal shot scale lower bound',
    ).toBeGreaterThanOrEqual(17);
    expect(
      position.distanceTo(target),
      '100s focal shot scale upper bound',
    ).toBeLessThanOrEqual(21);
  });

  it('resolves on a wide doorway-shadow tableau', () => {
    const pose = evaluateShotPlan(plan, 110.5);
    const position = new Vector3(...pose.position);
    const target = new Vector3(...pose.target);
    const focalPoint = new Vector3(...world.anchors.warning).lerp(
      new Vector3(...world.anchors.doorway),
      0.4,
    );

    expect(
      target.distanceTo(focalPoint),
      '110.5s target distance from doorway-shadow focal point',
    ).toBeLessThanOrEqual(0.75);
    expect(
      pose.fov,
      '110.5s tableau field of view lower bound',
    ).toBeGreaterThanOrEqual(38);
    expect(
      pose.fov,
      '110.5s tableau field of view upper bound',
    ).toBeLessThanOrEqual(40);
    expect(
      position.distanceTo(target),
      '110.5s tableau shot scale lower bound',
    ).toBeGreaterThanOrEqual(18);
    expect(
      position.distanceTo(target),
      '110.5s tableau shot scale upper bound',
    ).toBeLessThanOrEqual(20);
  });

  it('keeps the continuous authored path outside every home volume', () => {
    let worst = {
      clearance: Number.POSITIVE_INFINITY,
      home: 'none',
      nearestPoint: [0, 0, 0],
      position: [0, 0, 0],
      time: 0,
    };
    for (let time = 0; time <= duration; time += 0.1) {
      const pose = evaluateShotPlan(plan, time);
      const position = new Vector3(...pose.position);
      homeBounds.forEach((bounds, index) => {
        const clearance = bounds.distanceToPoint(position);
        if (clearance < worst.clearance) {
          worst = {
            clearance,
            home: world.graph.homes[index].name,
            nearestPoint: bounds.clampPoint(position, new Vector3()).toArray(),
            position: position.toArray(),
            time,
          };
        }
      });
    }
    expect(
      worst.clearance,
      `${worst.time.toFixed(1)}s clearance from ${worst.home}; camera ${worst.position.join(',')}; nearest ${worst.nearestPoint.join(',')}`,
    ).toBeGreaterThanOrEqual(3.8);
  });
});
