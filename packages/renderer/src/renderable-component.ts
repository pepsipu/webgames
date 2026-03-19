import type {
  Node,
} from "@webgame/engine";
import type {
  MeshComponent,
  MaterialComponent,
  TransformComponent,
} from "@webgame/game";
import {
  hasMesh,
  hasMaterial,
  hasTransform,
} from "@webgame/game";

export type RenderableNode =
  Node &
  TransformComponent &
  MeshComponent &
  MaterialComponent;

export function isRenderable(node: Node): node is RenderableNode {
  return hasTransform(node) && hasMesh(node) && hasMaterial(node);
}
