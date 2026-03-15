import type { Node } from "../node";

export interface Mesh {
  vertices: Float32Array;
  indices: Uint16Array;
}

export type MeshComponent = { mesh: Mesh };

export function hasMesh(node: Node): node is Node & MeshComponent {
  return (node as { mesh?: Mesh }).mesh !== undefined;
}
