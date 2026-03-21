import { Transform, TransformElement } from "./transform";

export interface CreateCameraOptions {
  transform: Transform;
  fovY: number;
  near: number;
  far: number;
}

export class CameraElement extends TransformElement {
  fovY: number;
  near: number;
  far: number;

  constructor(options: CreateCameraOptions) {
    super(options.transform);
    this.fovY = options.fovY;
    this.near = options.near;
    this.far = options.far;
  }
}

export function createCamera(options: CreateCameraOptions): CameraElement {
  return new CameraElement(options);
}
