import type {
  GeometryNode,
  MaterialNode,
  Node,
  TransformNode,
} from "@webgame/engine";
import type { NodeGpuResources } from "./gpu-resources";

export const gpuResourcesComponent = Symbol("gpuResources");

export type RenderableNode = TransformNode &
  GeometryNode &
  MaterialNode & {
    [gpuResourcesComponent]?: NodeGpuResources;
  };

export function isRenderable(node: Node): node is RenderableNode {
  return "transform" in node && "geometry" in node && "material" in node;
}
