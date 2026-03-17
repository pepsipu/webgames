import type { Node } from "../node";
import { Vector3 } from "../math/vector3";

export type Material = Vector3;

export type MaterialComponent = { material: Material };

export function hasMaterial(node: Node): node is Node & MaterialComponent {
  return "material" in node;
}

export function createMaterial(material: Material): Material {
  return Vector3.clone(material);
}
