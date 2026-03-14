export interface Geometry {
  vertices: Float32Array;
  indices: Uint16Array;
}

export interface GeometryNode {
  geometry: Geometry;
}

function pushVertex(vertices: number[], x: number, y: number, z: number): void {
  vertices.push(x, y, z);
}

export function createBoxGeometry({
  width,
  height,
  depth,
}: {
  width: number;
  height: number;
  depth: number;
}): Geometry {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  const vertices: number[] = [];

  pushVertex(vertices, -halfWidth, -halfHeight, -halfDepth);
  pushVertex(vertices, halfWidth, -halfHeight, -halfDepth);
  pushVertex(vertices, halfWidth, halfHeight, -halfDepth);
  pushVertex(vertices, -halfWidth, halfHeight, -halfDepth);
  pushVertex(vertices, -halfWidth, -halfHeight, halfDepth);
  pushVertex(vertices, halfWidth, -halfHeight, halfDepth);
  pushVertex(vertices, halfWidth, halfHeight, halfDepth);
  pushVertex(vertices, -halfWidth, halfHeight, halfDepth);

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array([
      4, 5, 6, 4, 6, 7,
      1, 0, 3, 1, 3, 2,
      0, 4, 7, 0, 7, 3,
      5, 1, 2, 5, 2, 6,
      3, 7, 6, 3, 6, 2,
      0, 1, 5, 0, 5, 4,
    ]),
  };
}

export function createTubeGeometry({
  radius,
  height,
  segments,
}: {
  radius: number;
  height: number;
  segments: number;
}): Geometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const halfHeight = height / 2;

  pushVertex(vertices, 0, halfHeight, 0);
  pushVertex(vertices, 0, -halfHeight, 0);

  for (let segment = 0; segment < segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2;
    const offsetX = Math.cos(angle) * radius;
    const offsetZ = Math.sin(angle) * radius;

    pushVertex(vertices, offsetX, halfHeight, offsetZ);
    pushVertex(vertices, offsetX, -halfHeight, offsetZ);
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
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}

export function createBallGeometry({
  radius,
  segments,
  rings,
}: {
  radius: number;
  segments: number;
  rings: number;
}): Geometry {
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

      pushVertex(vertices, offsetX, ringY, offsetZ);
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
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}
