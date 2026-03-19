import type { Node } from "@webgame/engine";

export interface Mesh {
  vertices: number[];
  indices: number[];
}

export type MeshComponent = { mesh: Mesh };

export function hasMesh(node: Node): node is Node & MeshComponent {
  return "mesh" in node;
}
