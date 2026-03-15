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
import type { NodeGpuResources } from "./gpu-resources";

export type GPUResourcesComponent = {
  gpuResources: NodeGpuResources;
};

export type RenderableNode =
  Node &
  TransformComponent &
  MeshComponent &
  MaterialComponent &
  Partial<GPUResourcesComponent>;

export function isRenderable(node: Node): node is RenderableNode {
  return hasTransform(node) && hasMesh(node) && hasMaterial(node);
}
