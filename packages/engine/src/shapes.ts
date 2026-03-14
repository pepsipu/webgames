import {
  createBallGeometry,
  createBoxGeometry,
  createTubeGeometry,
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

interface ShapeBase extends TransformNode, GeometryNode, MaterialNode {}

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

export interface Box extends ShapeBase {
  type: "box";
  width: number;
  height: number;
  depth: number;
}

export interface Tube extends ShapeBase {
  type: "tube";
  radius: number;
  height: number;
  segments: number;
}

export interface Ball extends ShapeBase {
  type: "ball";
  radius: number;
  segments: number;
  rings: number;
}

export function createBoxNode(options: BoxOptions): Box {
  return {
    ...createTransformNode(options.x ?? 0, options.y ?? 0, options.z ?? 0),
    type: "box",
    width: options.width,
    height: options.height,
    depth: options.depth,
    geometry: createBoxGeometry({
      width: options.width,
      height: options.height,
      depth: options.depth,
    }),
    material: createMaterial(options.color),
  };
}

export function createTubeNode(options: TubeOptions): Tube {
  const segments = options.segments ?? 24;

  return {
    ...createTransformNode(options.x ?? 0, options.y ?? 0, options.z ?? 0),
    type: "tube",
    radius: options.radius,
    height: options.height,
    segments,
    geometry: createTubeGeometry({
      radius: options.radius,
      height: options.height,
      segments,
    }),
    material: createMaterial(options.color),
  };
}

export function createBallNode(options: BallOptions): Ball {
  const segments = options.segments ?? 20;
  const rings = options.rings ?? 14;

  return {
    ...createTransformNode(options.x ?? 0, options.y ?? 0, options.z ?? 0),
    type: "ball",
    radius: options.radius,
    segments,
    rings,
    geometry: createBallGeometry({
      radius: options.radius,
      segments,
      rings,
    }),
    material: createMaterial(options.color),
  };
}
