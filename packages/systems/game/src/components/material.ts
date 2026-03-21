import { Vector3 } from "../math/vector3";

export type Material = Vector3;

export function cloneMaterial(material: Material): Material {
  return Vector3.clone(material);
}
