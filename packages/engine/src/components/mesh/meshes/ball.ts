import type { Mesh } from "../types";

interface BallMeshOptions {
  radius: number;
  segments: number;
  rings: number;
}

export function createBallMesh({
  radius,
  segments,
  rings,
}: BallMeshOptions): Mesh {
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring <= rings; ring += 1) {
    const ringAngle = (ring / rings) * Math.PI;
    const ringRadius = Math.sin(ringAngle) * radius;
    const ringY = Math.cos(ringAngle) * radius;

    for (let segment = 0; segment <= segments; segment += 1) {
      const segmentAngle = (segment / segments) * Math.PI * 2;
      const offsetX = Math.cos(segmentAngle) * ringRadius;
      const offsetZ = Math.sin(segmentAngle) * ringRadius;

      vertices.push(offsetX, ringY, offsetZ);
    }
  }

  const ringWidth = segments + 1;

  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const current = ring * ringWidth + segment;
      const next = current + ringWidth;

      indices.push(current, current + 1, next);
      indices.push(next, current + 1, next + 1);
    }
  }

  return {
    vertices,
    indices,
  };
}
