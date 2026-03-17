import { Mesh } from "../types";

interface BoxMeshOptions {
  width: number;
  height: number;
  depth: number;
}

export function createBoxMesh({
  width,
  height,
  depth,
}: BoxMeshOptions): Mesh {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  const vertices: number[] = [];

  vertices.push(-halfWidth, -halfHeight, -halfDepth);
  vertices.push(halfWidth, -halfHeight, -halfDepth);
  vertices.push(halfWidth, halfHeight, -halfDepth);
  vertices.push(-halfWidth, halfHeight, -halfDepth);
  vertices.push(-halfWidth, -halfHeight, halfDepth);
  vertices.push(halfWidth, -halfHeight, halfDepth);
  vertices.push(halfWidth, halfHeight, halfDepth);
  vertices.push(-halfWidth, halfHeight, halfDepth);

  return new Mesh(
    new Float32Array(vertices),
    new Uint16Array([
      4, 5, 6, 4, 6, 7, 1, 0, 3, 1, 3, 2, 0, 4, 7, 0, 7, 3, 5, 1, 2, 5, 2, 6, 3,
      7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4,
    ]),
  );
}
