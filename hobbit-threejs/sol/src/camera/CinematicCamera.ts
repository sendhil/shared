import { PerspectiveCamera, Vector3 } from 'three';
import {
  evaluateShotPlan,
  type CameraPose,
  type ShotPlan,
} from './shotPlan';

export class CinematicCamera {
  readonly target = new Vector3();

  constructor(
    readonly camera: PerspectiveCamera,
    readonly plan: ShotPlan,
  ) {}

  evaluate(time: number): CameraPose {
    const pose = evaluateShotPlan(this.plan, time);
    this.camera.position.set(...pose.position);
    this.target.set(...pose.target);
    this.camera.fov = pose.fov;
    this.camera.near = pose.near;
    this.camera.far = pose.far;
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    return pose;
  }

  apply(time: number): CameraPose {
    return this.evaluate(time);
  }
}
