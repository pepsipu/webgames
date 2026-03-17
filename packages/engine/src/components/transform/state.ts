import type { Node } from "../../node";
import type { Transform } from "./value";

export type TransformComponent = { transform: Transform };

export function hasTransform(node: Node): node is Node & TransformComponent {
  return "transform" in node;
}
