import type { Element } from "@webgame/engine";
import type { Transform } from "./value";

export type TransformComponent = { transform: Transform };

export function hasTransform(element: Element): element is Element & TransformComponent {
  return "transform" in element;
}
