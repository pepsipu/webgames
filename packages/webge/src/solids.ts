export type SolidColor = [number, number, number];

export interface SolidGpuResources {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
}

interface SolidBase {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  color: SolidColor;
  resources: SolidGpuResources;
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

export interface BoxSolid extends SolidBase {
  type: "box";
  width: number;
  height: number;
  depth: number;
}

export interface TubeSolid extends SolidBase {
  type: "tube";
  radius: number;
  height: number;
  segments: number;
}

export interface BallSolid extends SolidBase {
  type: "ball";
  radius: number;
  segments: number;
  rings: number;
}

export type Solid = BoxSolid | TubeSolid | BallSolid;

function copyColor(color: SolidColor | undefined): SolidColor {
  if (!color) {
    return [1, 1, 1];
  }

  return [color[0], color[1], color[2]];
}

export function createBoxSolid(
  options: BoxOptions,
  resources: SolidGpuResources,
): BoxSolid {
  return {
    type: "box",
    x: options.x,
    y: options.y,
    z: options.z,
    width: options.width,
    height: options.height,
    depth: options.depth,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    color: copyColor(options.color),
    resources,
  };
}

export function createTubeSolid(
  options: TubeOptions,
  resources: SolidGpuResources,
): TubeSolid {
  const segments = options.segments ?? 24;

  return {
    type: "tube",
    x: options.x,
    y: options.y,
    z: options.z,
    radius: options.radius,
    height: options.height,
    segments,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    color: copyColor(options.color),
    resources,
  };
}

export function createBallSolid(
  options: BallOptions,
  resources: SolidGpuResources,
): BallSolid {
  const segments = options.segments ?? 20;
  const rings = options.rings ?? 14;

  return {
    type: "ball",
    x: options.x,
    y: options.y,
    z: options.z,
    radius: options.radius,
    segments,
    rings,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    color: copyColor(options.color),
    resources,
  };
}

export function destroySolid(solid: Solid): void {
  solid.resources.vertexBuffer.destroy();
  solid.resources.indexBuffer.destroy();
  solid.resources.uniformBuffer.destroy();
}
