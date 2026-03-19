import type { Node } from "@webgame/engine";
import type { Transform } from "./value";

export type TransformComponent = { transform: Transform };

export function hasTransform(node: Node): node is Node & TransformComponent {
  return "transform" in node;
}
