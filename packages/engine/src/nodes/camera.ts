import {
  createTransformComponent,
  type TransformComponent,
} from "./transform";

export interface CameraComponent extends TransformComponent {
  fovY: number;
  near: number;
  far: number;
}

export type Camera = CameraComponent;

export function createCameraComponent(): CameraComponent {
  return {
    ...createTransformComponent(0, 0, 4),
    fovY: Math.PI / 3,
    near: 0.1,
    far: 100,
  };
}
