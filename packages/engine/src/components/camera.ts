import { createNode, type Node } from "../node";
import {
  Transform,
  type TransformComponent,
} from "./transform";
import { Vector3 } from "../math/vector3";

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
    transform: Transform.create(Vector3.create(0, 0, 4)),
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

export function hasCamera(node: Node): node is Node & CameraComponent {
  return "camera" in node;
}
