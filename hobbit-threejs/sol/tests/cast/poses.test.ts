import { describe, expect, it } from 'vitest';
import {
  JOINT_NAMES,
  POSES,
  REQUIRED_POSE_NAMES,
  interpolatePose,
} from '../../src/cast/poses';

describe('authored character poses', () => {
  it('includes restrained introduction, recoil, and elder weight poses', () => {
    expect(POSES).toHaveProperty('present');
    expect(POSES).toHaveProperty('recoil');
    expect(POSES).toHaveProperty('elderLean');

    expect(POSES.present.leftUpperArm).not.toEqual(POSES.present.rightUpperArm);
    expect(POSES.recoil.torso[0]).toBeLessThan(-0.15);
    expect(POSES.elderLean.torso[0]).toBeGreaterThan(0.15);
    expect(POSES.elderLean.head[1]).toBeLessThan(-0.45);
  });

  it('defines every required action with finite rotations for every joint', () => {
    expect(Object.keys(POSES).sort()).toEqual([...REQUIRED_POSE_NAMES].sort());

    for (const pose of Object.values(POSES)) {
      expect(Object.keys(pose).sort()).toEqual([...JOINT_NAMES].sort());
      expect(Object.values(pose).every((joint) => joint.every(Number.isFinite))).toBe(true);
    }
  });

  it('interpolates finite expressive joint rotations without erasing asymmetry', () => {
    const pose = interpolatePose(POSES.carryCrate, POSES.gossip, 0.5);

    expect(Object.values(pose).every((joint) => joint.every(Number.isFinite))).toBe(true);
    expect(pose.leftUpperArm).not.toEqual(pose.rightUpperArm);
    expect(pose.head).not.toEqual(POSES.carryCrate.head);
    expect(pose.head).not.toEqual(POSES.gossip.head);
  });

  it('clamps interpolation to exact authored endpoints', () => {
    expect(interpolatePose(POSES.idle, POSES.hammer, -2)).toEqual(POSES.idle);
    expect(interpolatePose(POSES.idle, POSES.hammer, 3)).toEqual(POSES.hammer);
  });
});
