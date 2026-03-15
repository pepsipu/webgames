import type { Node } from "../node";

export interface Geometry {
  vertices: Float32Array;
  indices: Uint16Array;
}

export type GeometryComponent = { geometry: Geometry };

export function hasGeometry(node: Node): node is Node & GeometryComponent {
  return (node as { geometry?: Geometry }).geometry !== undefined;
}
