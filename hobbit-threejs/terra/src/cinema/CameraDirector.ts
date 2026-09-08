import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { StoryState } from '../narrative/NarrativeDirector';
import type { WorldHandles } from '../world/buildWorld';
import { cameraShotCount, cameraShotForChapter, type CameraFocus } from './cameraPlan';

type Shot = { position: THREE.Vector3; target: THREE.Vector3; focalLength: number };

const eased = (value: number): number => {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
};

export class CameraDirector {
  readonly controls: OrbitControls;
  private spectator = false;
  private lastChapter = -1;
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera, domElement: HTMLElement, private readonly world: WorldHandles) {
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(2, 2, 2);
    this.camera.position.set(23, 15, 35);
    this.target.copy(this.controls.target);
  }

  setSpectator(enabled: boolean): void {
    this.spectator = enabled;
    this.controls.enabled = enabled;
    if (enabled) this.controls.update();
  }

  isSpectator(): boolean {
    return this.spectator;
  }

  update(state: StoryState, time: number): void {
    if (this.spectator) {
      this.controls.update();
      return;
    }

    const shot = this.shotFor(state, time);
    this.desired.copy(shot.position);
    this.desiredTarget.copy(shot.target);
    const chapterChanged = state.chapter !== this.lastChapter;
    this.lastChapter = state.chapter;
    const positionLerp = chapterChanged ? 0.12 : 0.042;
    const targetLerp = chapterChanged ? 0.14 : 0.052;
    this.camera.position.lerp(this.desired, positionLerp);
    this.target.lerp(this.desiredTarget, targetLerp);
    this.camera.setFocalLength(THREE.MathUtils.lerp(this.camera.getFocalLength(), shot.focalLength, chapterChanged ? 0.13 : 0.055));
    this.camera.lookAt(this.target);
  }

  private shotFor(state: StoryState, time: number): Shot {
    const house = this.world.houseAnchor.getWorldPosition(new THREE.Vector3());
    const party = this.world.partyAnchor.getWorldPosition(new THREE.Vector3());
    const rumor = this.world.rumorAnchor.getWorldPosition(new THREE.Vector3());
    const hill = this.world.hilltopAnchor.getWorldPosition(new THREE.Vector3());
    const hero = this.world.hero.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.25, 0));
    const breath = new THREE.Vector3(Math.sin(time * 0.13) * 0.45, Math.sin(time * 0.18) * 0.18, Math.cos(time * 0.13) * 0.45);

    const resolveFocus = (focus: CameraFocus, offset: readonly [number, number, number]): THREE.Vector3 => {
      const anchors: Record<CameraFocus, THREE.Vector3> = {
        house,
        houseFront: house,
        party,
        hero,
        rumor,
        hill,
      };
      return anchors[focus].clone().add(new THREE.Vector3(...offset));
    };
    const toShot = (chapter: number): Shot => {
      const plan = cameraShotForChapter(chapter);
      return {
        position: new THREE.Vector3(...plan.position).add(breath),
        target: resolveFocus(plan.focus, plan.focusOffset),
        focalLength: plan.focalLength,
      };
    };
    const current = toShot(state.chapter);
    const next = toShot(state.chapter + 1);
    const transition = state.localProgress > 0.79 && state.chapter < cameraShotCount - 1
      ? eased((state.localProgress - 0.79) / 0.21) * 0.32
      : 0;
    return {
      position: current.position.clone().lerp(next.position, transition),
      target: current.target.clone().lerp(next.target, transition),
      focalLength: THREE.MathUtils.lerp(current.focalLength, next.focalLength, transition),
    };
  }
}
