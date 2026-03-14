import type { Vector3 } from "./transform";

export type Material = Vector3;

export interface MaterialNode {
  material: Material;
}

function copyMaterial(material: Material | undefined): Material {
  if (!material) {
    return [1, 1, 1];
  }

  return [material[0], material[1], material[2]];
}

export function createMaterial(material?: Material): Material {
  return copyMaterial(material);
}
