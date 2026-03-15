export interface Vector3 extends Array<number> {
  0: number;
  1: number;
  2: number;
}

export class Vector3 {
  static create(x = 0, y = 0, z = 0): Vector3 {
    return [x, y, z] as Vector3;
  }

  static clone(source: Vector3 | undefined, x = 0, y = 0, z = 0): Vector3 {
    const output = Vector3.create(x, y, z);

    if (source) {
      Vector3.copy(output, source);
    }

    return output;
  }

  static copy(output: Vector3, source: Vector3): void {
    output[0] = source[0];
    output[1] = source[1];
    output[2] = source[2];
  }

  static set(output: Vector3, x: number, y: number, z: number): void {
    output[0] = x;
    output[1] = y;
    output[2] = z;
  }
}
