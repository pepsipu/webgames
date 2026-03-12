export type Vector3 = [number, number, number];

export type Quaternion = [number, number, number, number];

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export function setRotationFromEuler(
  rotation: Quaternion,
  x: number,
  y: number,
  z: number,
): void {
  const halfX = x * 0.5;
  const halfY = y * 0.5;
  const halfZ = z * 0.5;
  const sinX = Math.sin(halfX);
  const cosX = Math.cos(halfX);
  const sinY = Math.sin(halfY);
  const cosY = Math.cos(halfY);
  const sinZ = Math.sin(halfZ);
  const cosZ = Math.cos(halfZ);

  rotation[0] = sinX * cosY * cosZ - cosX * sinY * sinZ;
  rotation[1] = cosX * sinY * cosZ + sinX * cosY * sinZ;
  rotation[2] = cosX * cosY * sinZ - sinX * sinY * cosZ;
  rotation[3] = cosX * cosY * cosZ + sinX * sinY * sinZ;
}
