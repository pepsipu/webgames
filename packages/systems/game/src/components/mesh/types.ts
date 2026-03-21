import type { Element } from "@webgame/engine";

export interface Mesh {
  vertices: number[];
  indices: number[];
}

export type MeshComponent = { mesh: Mesh };

export function hasMesh(element: Element): element is Element & MeshComponent {
  return "mesh" in element;
}
