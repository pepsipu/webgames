import { createElement, type Element } from "@webgame/engine";
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
export type CameraElement = Element & TransformComponent & CameraComponent;

export function createCamera(
  options: CreateCameraOptions = {
    transform: Transform.create(),
    camera: {
      fovY: Math.PI / 3,
      near: 0.1,
      far: 100,
    },
  },
): CameraElement {
  return createElement({
    transform: Transform.clone(options.transform),
    camera: { ...options.camera },
  });
}

export function hasCamera(element: Element): element is CameraElement {
  return "camera" in element && hasTransform(element);
}
