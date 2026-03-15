import {
  createBallGeometry,
  createBoxGeometry,
  createTubeGeometry,
  type Geometry,
  type GeometryComponent,
} from "./geometry";
import {
  createMaterial,
  type Material,
  type MaterialComponent,
} from "./material";
import {
  createTransform,
  type TransformComponent,
  type TransformOptions,
} from "./transform";
import {
  createNode,
  type Node,
} from "./node";

interface ShapeOptionsBase {
  transform?: TransformOptions;
  color?: Material;
}

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

export type ShapeComponent =
  TransformComponent &
  GeometryComponent &
  MaterialComponent;

type ShapeNode = Node & ShapeComponent;

function createShape(
  options: ShapeOptionsBase,
  geometry: Geometry,
): ShapeNode {
  return createNode({
    transform: createTransform(options.transform),
    geometry,
    material: createMaterial(options.color),
  });
}

export function createBox(
  options: BoxOptions,
): ShapeNode {
  return createShape(options, createBoxGeometry({
    width: options.width,
    height: options.height,
    depth: options.depth,
  }));
}

export function createTube(
  options: TubeOptions,
): ShapeNode {
  const segments = options.segments ?? 24;

  return createShape(options, createTubeGeometry({
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

  return createShape(options, createBallGeometry({
    radius: options.radius,
    segments,
    rings,
  }));
}
