import {
  createBallGeometry,
  createBoxGeometry,
  createTubeGeometry,
  type SolidGeometry,
} from "./geometry";

const BOX_COLOR = [0.91, 0.34, 0.27] as const;
const TUBE_COLOR = [0.15, 0.64, 0.57] as const;
const BALL_COLOR = [0.92, 0.77, 0.18] as const;

export interface SolidGpuResources {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
}

interface SolidBase {
  x: number;
  y: number;
  z: number;
  resources: SolidGpuResources;
}

export interface BoxOptions {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export interface TubeOptions {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  segments?: number;
}

export interface BallOptions {
  x: number;
  y: number;
  z: number;
  radius: number;
  segments?: number;
  rings?: number;
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

function createBuffer(
  device: GPUDevice,
  data: Float32Array | Uint16Array,
  usage: GPUBufferUsageFlags,
): GPUBuffer {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });

  new Uint8Array(buffer.getMappedRange()).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );

  buffer.unmap();

  return buffer;
}

function createGpuResources(
  device: GPUDevice,
  geometry: SolidGeometry,
): SolidGpuResources {
  return {
    vertexBuffer: createBuffer(device, geometry.vertices, GPUBufferUsage.VERTEX),
    indexBuffer: createBuffer(device, geometry.indices, GPUBufferUsage.INDEX),
    indexCount: geometry.indices.length,
  };
}

export function createBoxSolid(
  device: GPUDevice,
  options: BoxOptions,
): BoxSolid {
  const geometry = createBoxGeometry({
    ...options,
    color: BOX_COLOR,
  });

  return {
    type: "box",
    ...options,
    resources: createGpuResources(device, geometry),
  };
}

export function createTubeSolid(
  device: GPUDevice,
  options: TubeOptions,
): TubeSolid {
  const segments = options.segments ?? 24;
  const geometry = createTubeGeometry({
    ...options,
    segments,
    color: TUBE_COLOR,
  });

  return {
    type: "tube",
    ...options,
    segments,
    resources: createGpuResources(device, geometry),
  };
}

export function createBallSolid(
  device: GPUDevice,
  options: BallOptions,
): BallSolid {
  const segments = options.segments ?? 20;
  const rings = options.rings ?? 14;
  const geometry = createBallGeometry({
    ...options,
    segments,
    rings,
    color: BALL_COLOR,
  });

  return {
    type: "ball",
    ...options,
    segments,
    rings,
    resources: createGpuResources(device, geometry),
  };
}

export function destroySolid(solid: Solid): void {
  solid.resources.vertexBuffer.destroy();
  solid.resources.indexBuffer.destroy();
}
