import {
  createBallGeometry,
  createBoxGeometry,
  createTubeGeometry,
  type Geometry,
  type GeometryNode,
} from "./geometry";
import {
  createMaterial,
  type Material,
  type MaterialNode,
} from "./material";
import {
  createTransformNode,
  type TransformNode,
  type TransformNodeOptions,
} from "./transform";

export type ShapeNode = TransformNode & GeometryNode & MaterialNode;

interface ShapeOptionsBase extends TransformNodeOptions {
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

function createShapeNode(
  options: ShapeOptionsBase,
  geometry: Geometry,
): ShapeNode {
  return {
    ...createTransformNode(options.x ?? 0, options.y ?? 0, options.z ?? 0),
    geometry,
    material: createMaterial(options.color),
  };
}

export function createBoxNode(options: BoxOptions): ShapeNode {
  return createShapeNode(options, createBoxGeometry({
    width: options.width,
    height: options.height,
    depth: options.depth,
  }));
}

export function createTubeNode(options: TubeOptions): ShapeNode {
  const segments = options.segments ?? 24;

  return createShapeNode(options, createTubeGeometry({
    radius: options.radius,
    height: options.height,
    segments,
  }));
}

export function createBallNode(options: BallOptions): ShapeNode {
  const segments = options.segments ?? 20;
  const rings = options.rings ?? 14;

  return createShapeNode(options, createBallGeometry({
    radius: options.radius,
    segments,
    rings,
  }));
}
