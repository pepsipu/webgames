import type { Quat, Vec3 } from "../types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeInput(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (length <= 1) {
    return { x, y };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

export function normalizeQuat(q: ArrayLike<number>): Quat {
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  if (length < 1e-8) {
    return [0, 0, 0, 1];
  }

  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

export function multiplyQuat(a: ArrayLike<number>, b: ArrayLike<number>): Quat {
  const ax = a[0];
  const ay = a[1];
  const az = a[2];
  const aw = a[3];
  const bx = b[0];
  const by = b[1];
  const bz = b[2];
  const bw = b[3];

  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatFromAxisAngle(
  x: number,
  y: number,
  z: number,
  angle: number,
): Quat {
  const half = angle * 0.5;
  const s = Math.sin(half);
  return [x * s, y * s, z * s, Math.cos(half)];
}

export function normalizeVec3(vector: ArrayLike<number>): Vec3 {
  const x = vector[0];
  const y = vector[1];
  const z = vector[2];
  const length = Math.hypot(x, y, z);
  if (length < 1e-8) {
    return [0, 0, 0];
  }

  return [x / length, y / length, z / length];
}

export function crossVec3(a: ArrayLike<number>, b: ArrayLike<number>): Vec3 {
  const ax = a[0];
  const ay = a[1];
  const az = a[2];
  const bx = b[0];
  const by = b[1];
  const bz = b[2];

  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
}

export function dotVec3(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const ax = a[0];
  const ay = a[1];
  const az = a[2];
  const bx = b[0];
  const by = b[1];
  const bz = b[2];

  return ax * bx + ay * by + az * bz;
}
