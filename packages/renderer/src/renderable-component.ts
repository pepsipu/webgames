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

export type GPUResourcesComponent = {
  gpuResources: NodeGpuResources;
};

export type RenderableNode =
  Node &
  TransformComponent &
  GeometryComponent &
  MaterialComponent &
  Partial<GPUResourcesComponent>;

export function isRenderable(node: Node): node is RenderableNode {
  return hasTransform(node) && hasGeometry(node) && hasMaterial(node);
}
