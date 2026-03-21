import type { Element } from "@webgame/engine";
import type {
  MeshComponent,
  MaterialComponent,
  TransformComponent,
} from "@webgame/game";
import { hasMesh, hasMaterial, hasTransform } from "@webgame/game";

export type RenderableElement = Element &
  TransformComponent &
  MeshComponent &
  MaterialComponent;

export function isRenderable(element: Element): element is RenderableElement {
  return hasTransform(element) && hasMesh(element) && hasMaterial(element);
}
