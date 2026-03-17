export interface Quaternion extends Array<number> {
  0: number;
  1: number;
  2: number;
  3: number;
}

export class Quaternion {
  static create(x = 0, y = 0, z = 0, w = 1): Quaternion {
    return [x, y, z, w] as Quaternion;
  }

  static clone(source: Quaternion): Quaternion {
    return [source[0], source[1], source[2], source[3]] as Quaternion;
  }

  static copy(output: Quaternion, source: Quaternion): void {
    output[0] = source[0];
    output[1] = source[1];
    output[2] = source[2];
    output[3] = source[3];
  }

  static set(
    output: Quaternion,
    x: number,
    y: number,
    z: number,
    w: number,
  ): void {
    output[0] = x;
    output[1] = y;
    output[2] = z;
    output[3] = w;
  }
}
