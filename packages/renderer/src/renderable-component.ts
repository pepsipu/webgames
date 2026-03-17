import type {
  Node,
  NodeWith,
} from "@webgame/engine";
import {
  getComponent,
  Material,
  Mesh,
  Transform,
} from "@webgame/engine";
import type { NodeGpuResources } from "./gpu-resources";

export type GPUResourcesComponent = {
  gpuResources: NodeGpuResources;
};

export type RenderableNode =
  NodeWith<[typeof Transform, typeof Mesh, typeof Material]> &
  Partial<GPUResourcesComponent>;

export function isRenderable(node: Node): node is RenderableNode {
  return (
    getComponent(node, Transform) !== null &&
    getComponent(node, Mesh) !== null &&
    getComponent(node, Material) !== null
  );
}
