import type { Mesh } from "../types";

interface TubeMeshOptions {
  radius: number;
  height: number;
  segments: number;
}

export function createTubeMesh({
  radius,
  height,
  segments,
}: TubeMeshOptions): Mesh {
  const vertices: number[] = [];
  const indices: number[] = [];
  const halfHeight = height / 2;

  vertices.push(0, halfHeight, 0);
  vertices.push(0, -halfHeight, 0);

  for (let segment = 0; segment < segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2;
    const offsetX = Math.cos(angle) * radius;
    const offsetZ = Math.sin(angle) * radius;

    vertices.push(offsetX, halfHeight, offsetZ);
    vertices.push(offsetX, -halfHeight, offsetZ);
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const nextSegment = (segment + 1) % segments;
    const topCurrent = 2 + segment * 2;
    const bottomCurrent = topCurrent + 1;
    const topNext = 2 + nextSegment * 2;
    const bottomNext = topNext + 1;

    indices.push(0, topNext, topCurrent);
    indices.push(1, bottomCurrent, bottomNext);
    indices.push(topCurrent, topNext, bottomCurrent);
    indices.push(bottomCurrent, topNext, bottomNext);
  }

  return {
    vertices,
    indices,
  };
}
