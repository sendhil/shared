export type Vec3Tuple = readonly [x: number, y: number, z: number];
export type TransformTuple = readonly [
  x: number,
  y: number,
  z: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
];

export function transformTuple(
  x: number,
  y: number,
  z: number,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  scaleX = 1,
  scaleY = 1,
  scaleZ = 1,
): TransformTuple {
  const values = [x, y, z, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ] as const;
  if (!values.every(Number.isFinite)) throw new RangeError('world transforms must contain only finite values');
  return Object.freeze(values);
}
