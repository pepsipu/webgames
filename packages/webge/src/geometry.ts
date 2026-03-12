type Color = readonly [number, number, number];

export interface SolidGeometry {
  vertices: Float32Array;
  indices: Uint16Array;
}

interface BoxGeometryOptions {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: Color;
}

interface TubeGeometryOptions {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  segments: number;
  color: Color;
}

interface BallGeometryOptions {
  x: number;
  y: number;
  z: number;
  radius: number;
  segments: number;
  rings: number;
  color: Color;
}

function pushVertex(
  vertices: number[],
  x: number,
  y: number,
  z: number,
  color: Color,
): void {
  vertices.push(x, y, z, color[0], color[1], color[2]);
}

export function createBoxGeometry({
  x,
  y,
  z,
  width,
  height,
  depth,
  color,
}: BoxGeometryOptions): SolidGeometry {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  const vertices: number[] = [];

  pushVertex(vertices, x - halfWidth, y - halfHeight, z - halfDepth, color);
  pushVertex(vertices, x + halfWidth, y - halfHeight, z - halfDepth, color);
  pushVertex(vertices, x + halfWidth, y + halfHeight, z - halfDepth, color);
  pushVertex(vertices, x - halfWidth, y + halfHeight, z - halfDepth, color);
  pushVertex(vertices, x - halfWidth, y - halfHeight, z + halfDepth, color);
  pushVertex(vertices, x + halfWidth, y - halfHeight, z + halfDepth, color);
  pushVertex(vertices, x + halfWidth, y + halfHeight, z + halfDepth, color);
  pushVertex(vertices, x - halfWidth, y + halfHeight, z + halfDepth, color);

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
  x,
  y,
  z,
  radius,
  height,
  segments,
  color,
}: TubeGeometryOptions): SolidGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const halfHeight = height / 2;

  pushVertex(vertices, x, y + halfHeight, z, color);
  pushVertex(vertices, x, y - halfHeight, z, color);

  for (let segment = 0; segment < segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2;
    const offsetX = Math.cos(angle) * radius;
    const offsetZ = Math.sin(angle) * radius;

    pushVertex(vertices, x + offsetX, y + halfHeight, z + offsetZ, color);
    pushVertex(vertices, x + offsetX, y - halfHeight, z + offsetZ, color);
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
  x,
  y,
  z,
  radius,
  segments,
  rings,
  color,
}: BallGeometryOptions): SolidGeometry {
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

      pushVertex(vertices, x + offsetX, y + ringY, z + offsetZ, color);
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
