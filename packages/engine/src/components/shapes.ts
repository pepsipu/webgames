import {
  createBallMesh,
  createBoxMesh,
  createTubeMesh,
  Mesh,
} from "./mesh";
import { Material } from "./material";
import {
  addComponent,
  type NodeWith,
} from "./component";
import {
  Transform,
  type TransformOptions,
} from "./transform";
import {
  createNode,
} from "../node";
import type { Vector3 } from "../math/vector3";

interface ShapeOptionsBase {
  transform?: TransformOptions;
  color?: Vector3;
}

export type ShapeNode = NodeWith<[typeof Transform, typeof Mesh, typeof Material]>;

export interface BoxOptions extends ShapeOptionsBase {
  width: number;
  height: number;
  depth: number;
}

export interface TubeOptions extends ShapeOptionsBase {
  radius: number;
  height: number;
  segments?: number;
}

export interface BallOptions extends ShapeOptionsBase {
  radius: number;
  segments?: number;
  rings?: number;
}

function createShape(
  options: ShapeOptionsBase,
  mesh: Mesh,
): ShapeNode {
  const node = createNode();

  addComponent(node, new Transform(options.transform));
  addComponent(node, mesh);
  addComponent(node, new Material(options.color));

  return node as ShapeNode;
}

export function createBox(
  options: BoxOptions,
): ShapeNode {
  return createShape(options, createBoxMesh({
    width: options.width,
    height: options.height,
    depth: options.depth,
  }));
}

export function createTube(
  options: TubeOptions,
): ShapeNode {
  const segments = options.segments ?? 24;

  return createShape(options, createTubeMesh({
    radius: options.radius,
    height: options.height,
    segments,
  }));
}

export function createBall(
  options: BallOptions,
): ShapeNode {
  const segments = options.segments ?? 20;
  const rings = options.rings ?? 14;

  return createShape(options, createBallMesh({
    radius: options.radius,
    segments,
    rings,
  }));
}
