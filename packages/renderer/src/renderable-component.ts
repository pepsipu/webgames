import type {
  GeometryComponent,
  MaterialComponent,
  Node,
  TransformComponent,
} from "@webgame/engine";
import {
  hasGeometry,
  hasMaterial,
  hasTransform,
} from "@webgame/engine";
import type { NodeGpuResources } from "./gpu-resources";

export const gpuResourcesNode = Symbol("gpuResources");

export type RenderableNode =
  Node &
  TransformComponent &
  GeometryComponent &
  MaterialComponent & {
    [gpuResourcesNode]?: NodeGpuResources;
  };

export function isRenderable(node: Node): node is RenderableNode {
  return hasTransform(node) && hasGeometry(node) && hasMaterial(node);
}
