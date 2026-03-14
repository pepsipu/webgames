import type { Geometry } from "./geometry";
import {
  createTransformNode,
  type TransformNode,
} from "./transform";

export type SolidColor = [number, number, number];

interface SolidBase extends TransformNode {
  color: SolidColor;
  geometry: Geometry;
}

interface SolidOptionsBase {
  parent?: TransformNode;
  x: number;
  y: number;
  z: number;
  color?: SolidColor;
}

export interface BoxOptions extends SolidOptionsBase {
  width: number;
  height: number;
  depth: number;
}

export interface TubeOptions extends SolidOptionsBase {
  radius: number;
  height: number;
  segments?: number;
}

export interface BallOptions extends SolidOptionsBase {
  radius: number;
  segments?: number;
  rings?: number;
}

export interface Box extends SolidBase {
  type: "box";
  width: number;
  height: number;
  depth: number;
}

export interface Tube extends SolidBase {
  type: "tube";
  radius: number;
  height: number;
  segments: number;
}

export interface Ball extends SolidBase {
  type: "ball";
  radius: number;
  segments: number;
  rings: number;
}

export type Solid = Box | Tube | Ball;

export function isSolid(node: TransformNode): node is Solid {
  return "geometry" in node;
}

function copyColor(color: SolidColor | undefined): SolidColor {
  if (!color) {
    return [1, 1, 1];
  }

  return [color[0], color[1], color[2]];
}

export function createBoxSolid(
  options: BoxOptions,
  geometry: Geometry,
): Box {
  return {
    ...createTransformNode(options.x, options.y, options.z),
    type: "box",
    width: options.width,
    height: options.height,
    depth: options.depth,
    color: copyColor(options.color),
    geometry,
  };
}

export function createTubeSolid(
  options: TubeOptions,
  geometry: Geometry,
): Tube {
  const segments = options.segments ?? 24;

  return {
    ...createTransformNode(options.x, options.y, options.z),
    type: "tube",
    radius: options.radius,
    height: options.height,
    segments,
    color: copyColor(options.color),
    geometry,
  };
}

export function createBallSolid(
  options: BallOptions,
  geometry: Geometry,
): Ball {
  const segments = options.segments ?? 20;
  const rings = options.rings ?? 14;

  return {
    ...createTransformNode(options.x, options.y, options.z),
    type: "ball",
    radius: options.radius,
    segments,
    rings,
    color: copyColor(options.color),
    geometry,
  };
}
