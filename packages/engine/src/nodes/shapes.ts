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
  createTransformComponent,
  type TransformComponent,
  type TransformComponentOptions,
} from "./transform";

export type ShapeComponent = TransformComponent &
  GeometryComponent &
  MaterialComponent;

interface ShapeOptionsBase extends TransformComponentOptions {
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

function createShapeComponent(
  options: ShapeOptionsBase,
  geometry: Geometry,
): ShapeComponent {
  return {
    ...createTransformComponent(options.x ?? 0, options.y ?? 0, options.z ?? 0),
    geometry,
    material: createMaterial(options.color),
  };
}

export function createBoxComponent(options: BoxOptions): ShapeComponent {
  return createShapeComponent(options, createBoxGeometry({
    width: options.width,
    height: options.height,
    depth: options.depth,
  }));
}

export function createTubeComponent(options: TubeOptions): ShapeComponent {
  const segments = options.segments ?? 24;

  return createShapeComponent(options, createTubeGeometry({
    radius: options.radius,
    height: options.height,
    segments,
  }));
}

export function createBallComponent(options: BallOptions): ShapeComponent {
  const segments = options.segments ?? 20;
  const rings = options.rings ?? 14;

  return createShapeComponent(options, createBallGeometry({
    radius: options.radius,
    segments,
    rings,
  }));
}
