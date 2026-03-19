import { createNode, type Node } from "@webgame/engine";
import {
  Transform,
  hasTransform,
  type TransformComponent,
} from "./transform";

export interface Camera {
  fovY: number;
  near: number;
  far: number;
}

export interface CreateCameraOptions {
  transform: Transform;
  camera: Camera;
}

export type CameraComponent = { camera: Camera };
export type CameraNode = Node & TransformComponent & CameraComponent;

export function createCamera(
  options: CreateCameraOptions = {
    transform: Transform.create(),
    camera: {
      fovY: Math.PI / 3,
      near: 0.1,
      far: 100,
    },
  },
): CameraNode {
  return createNode({
    transform: Transform.clone(options.transform),
    camera: { ...options.camera },
  });
}

export function hasCamera(node: Node): node is CameraNode {
  return "camera" in node && hasTransform(node);
}
