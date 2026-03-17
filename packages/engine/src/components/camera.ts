import {
  addComponent,
  type NodeWith,
} from "./component";
import { Transform, type TransformOptions } from "./transform";
import { createNode } from "../node";
import { Component } from "./component";

export class Camera extends Component {
  static readonly key = "camera";
  fovY: number;
  near: number;
  far: number;

  constructor(options: CameraOptions = {}) {
    super();
    this.fovY = options.fovY ?? Math.PI / 3;
    this.near = options.near ?? 0.1;
    this.far = options.far ?? 100;
  }
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

export type CameraNode = NodeWith<[typeof Transform, typeof Camera]>;

export function createCamera(
  options: CreateCameraOptions = {},
): CameraNode {
  const transform = options.transform;
  const node = createNode();

  addComponent(node, new Transform({
    position: transform?.position ?? [0, 0, 4],
    rotation: transform?.rotation,
    scale: transform?.scale,
  }));
  addComponent(node, new Camera(options.camera));

  return node as CameraNode;
}
