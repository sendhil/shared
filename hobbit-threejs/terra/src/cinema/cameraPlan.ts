export type CameraFocus = 'house' | 'houseFront' | 'party' | 'hero' | 'rumor' | 'hill';

export type CameraShotPlan = {
  position: readonly [number, number, number];
  focus: CameraFocus;
  focusOffset: readonly [number, number, number];
  focalLength: number;
};

const CAMERA_SHOTS: readonly CameraShotPlan[] = [
  { position: [25, 15.5, 35], focus: 'houseFront', focusOffset: [-0.6, 1.8, 2.8], focalLength: 42 },
  { position: [-2.5, 9.4, 23.5], focus: 'party', focusOffset: [0, 1.2, 5.6], focalLength: 47 },
  { position: [14.5, 9.8, 28], focus: 'houseFront', focusOffset: [0, 1.45, 3.9], focalLength: 48 },
  { position: [19.5, 12.8, 29], focus: 'houseFront', focusOffset: [0.2, 1.8, 3.5], focalLength: 46 },
  { position: [-5.2, 8.8, 24], focus: 'rumor', focusOffset: [-0.8, 0.45, 0.45], focalLength: 54 },
  { position: [25.5, 14.8, 33.5], focus: 'houseFront', focusOffset: [0, 1.55, 4.1], focalLength: 50 },
];

export const cameraShotForChapter = (chapter: number): CameraShotPlan =>
  CAMERA_SHOTS[Math.min(CAMERA_SHOTS.length - 1, Math.max(0, chapter))];

export const cameraShotCount = CAMERA_SHOTS.length;
