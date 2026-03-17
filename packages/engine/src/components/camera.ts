import { createNode, type Node } from "../node";
import {
  Transform,
  type TransformComponent,
  type TransformOptions,
} from "./transform";

export interface Camera {
  fovY: number;
  near: number;
  far: number;
}

export interface CameraOptions {
  fovY?: number;
  near?: number;
  far?: number;
}

export interface CreateCameraOptions {
  transform?: TransformOptions;
  camera?: CameraOptions;
}

export type CameraComponent = { camera: Camera };
export type CameraNode = Node & TransformComponent & CameraComponent;

export function createCamera(
  options: CreateCameraOptions = {},
): CameraNode {
  const transform = options.transform;

  return createNode({
    transform: Transform.create({
      position: transform?.position ?? [0, 0, 4],
      rotation: transform?.rotation,
      scale: transform?.scale,
    }),
    camera: {
      fovY: options.camera?.fovY ?? Math.PI / 3,
      near: options.camera?.near ?? 0.1,
      far: options.camera?.far ?? 100,
    },
  });
}

export function hasCamera(node: Node): node is Node & CameraComponent {
  return (node as { camera?: Camera }).camera !== undefined;
}
