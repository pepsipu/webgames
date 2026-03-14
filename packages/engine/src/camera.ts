import {
  createTransformNode,
  type TransformNode,
} from "./transform";

export interface CameraNode extends TransformNode {
  fovY: number;
  near: number;
  far: number;
}

export type Camera = CameraNode;

export function createCameraNode(): CameraNode {
  return {
    ...createTransformNode(0, 0, 4),
    fovY: Math.PI / 3,
    near: 0.1,
    far: 100,
  };
}
