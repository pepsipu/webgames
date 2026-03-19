import type {
  MeshComponent,
  MaterialComponent,
  Node,
  TransformComponent,
} from "@webgame/engine";
import {
  hasMesh,
  hasMaterial,
  hasTransform,
} from "@webgame/engine";

export type RenderableNode =
  Node &
  TransformComponent &
  MeshComponent &
  MaterialComponent;

export function isRenderable(node: Node): node is RenderableNode {
  return hasTransform(node) && hasMesh(node) && hasMaterial(node);
}
