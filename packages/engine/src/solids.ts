import type { Geometry } from "./geometry";
import type { Transform } from "./transform";

export type SolidColor = [number, number, number];

interface SolidBase {
  transform: Transform;
  color: SolidColor;
  geometry: Geometry;
}

export interface BoxOptions {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color?: SolidColor;
}

export interface TubeOptions {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  segments?: number;
  color?: SolidColor;
}

export interface BallOptions {
  x: number;
  y: number;
  z: number;
  radius: number;
  segments?: number;
  rings?: number;
  color?: SolidColor;
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

function copyColor(color: SolidColor | undefined): SolidColor {
  if (!color) {
    return [1, 1, 1];
  }

  return [color[0], color[1], color[2]];
}

function createTransform(x: number, y: number, z: number): Transform {
  return {
    position: [x, y, z],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  };
}

export function createBoxSolid(
  options: BoxOptions,
  geometry: Geometry,
): Box {
  return {
    type: "box",
    transform: createTransform(options.x, options.y, options.z),
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
    type: "tube",
    transform: createTransform(options.x, options.y, options.z),
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
    type: "ball",
    transform: createTransform(options.x, options.y, options.z),
    radius: options.radius,
    segments,
    rings,
    color: copyColor(options.color),
    geometry,
  };
}
