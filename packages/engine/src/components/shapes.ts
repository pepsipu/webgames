import {
  createBallMesh,
  createBoxMesh,
  createTubeMesh,
  type Mesh,
  type MeshComponent,
} from "./mesh";
import {
  createMaterial,
  type Material,
  type MaterialComponent,
} from "./material";
import {
  Transform,
  type TransformComponent,
} from "./transform";
import {
  createNode,
  type Node,
} from "../node";

interface ShapeOptionsBase {
  transform: Transform;
  color: Material;
}

export interface BoxOptions extends ShapeOptionsBase {
  width: number;
  height: number;
  depth: number;
}

export interface TubeOptions extends ShapeOptionsBase {
  radius: number;
  height: number;
  segments: number;
}

export interface BallOptions extends ShapeOptionsBase {
  radius: number;
  segments: number;
  rings: number;
}

export type ShapeComponent =
  TransformComponent &
  MeshComponent &
  MaterialComponent;

type ShapeNode = Node & ShapeComponent;

function createShape(
  options: ShapeOptionsBase,
  mesh: Mesh,
): ShapeNode {
  return createNode({
    transform: Transform.clone(options.transform),
    mesh,
    material: createMaterial(options.color),
  });
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
  return createShape(options, createTubeMesh({
    radius: options.radius,
    height: options.height,
    segments: options.segments,
  }));
}

export function createBall(
  options: BallOptions,
): ShapeNode {
  return createShape(options, createBallMesh({
    radius: options.radius,
    segments: options.segments,
    rings: options.rings,
  }));
}
