import type { Quaternion, Vector3 } from "./transform";

export interface Camera {
  position: Vector3;
  rotation: Quaternion;
  fovY: number;
  near: number;
  far: number;
}

export function createCamera(): Camera {
  return {
    position: [0, 0, 4],
    rotation: [0, 0, 0, 1],
    fovY: Math.PI / 3,
    near: 0.1,
    far: 100,
  };
}
