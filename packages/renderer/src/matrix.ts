import type { Quaternion, Vector3 } from "@webgame/game";

export type Matrix4 = Float32Array<ArrayBuffer>;

export function createMatrix4(): Matrix4 {
  return new Float32Array(new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT));
}

export function multiplyMatrices(
  output: Matrix4,
  left: Matrix4,
  right: Matrix4,
): void {
  for (let column = 0; column < 4; column += 1) {
    const offset = column * 4;
    const right0 = right[offset];
    const right1 = right[offset + 1];
    const right2 = right[offset + 2];
    const right3 = right[offset + 3];

    output[offset] =
      left[0] * right0 +
      left[4] * right1 +
      left[8] * right2 +
      left[12] * right3;
    output[offset + 1] =
      left[1] * right0 +
      left[5] * right1 +
      left[9] * right2 +
      left[13] * right3;
    output[offset + 2] =
      left[2] * right0 +
      left[6] * right1 +
      left[10] * right2 +
      left[14] * right3;
    output[offset + 3] =
      left[3] * right0 +
      left[7] * right1 +
      left[11] * right2 +
      left[15] * right3;
  }
}

export function setPerspectiveMatrix(
  output: Matrix4,
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): void {
  const focalLength = 1 / Math.tan(fovY * 0.5);

  output[0] = focalLength / aspect;
  output[1] = 0;
  output[2] = 0;
  output[3] = 0;
  output[4] = 0;
  output[5] = focalLength;
  output[6] = 0;
  output[7] = 0;
  output[8] = 0;
  output[9] = 0;
  output[10] = far / (near - far);
  output[11] = -1;
  output[12] = 0;
  output[13] = 0;
  output[14] = (near * far) / (near - far);
  output[15] = 0;
}

export function setViewMatrix(
  output: Matrix4,
  position: Vector3,
  rotation: Quaternion,
): void {
  const x = -rotation[0];
  const y = -rotation[1];
  const z = -rotation[2];
  const w = rotation[3];
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;

  output[0] = 1 - 2 * (yy + zz);
  output[1] = 2 * (xy - wz);
  output[2] = 2 * (xz + wy);
  output[3] = 0;
  output[4] = 2 * (xy + wz);
  output[5] = 1 - 2 * (xx + zz);
  output[6] = 2 * (yz - wx);
  output[7] = 0;
  output[8] = 2 * (xz - wy);
  output[9] = 2 * (yz + wx);
  output[10] = 1 - 2 * (xx + yy);
  output[11] = 0;
  output[12] = -(
    output[0] * position[0] +
    output[4] * position[1] +
    output[8] * position[2]
  );
  output[13] = -(
    output[1] * position[0] +
    output[5] * position[1] +
    output[9] * position[2]
  );
  output[14] = -(
    output[2] * position[0] +
    output[6] * position[1] +
    output[10] * position[2]
  );
  output[15] = 1;
}
