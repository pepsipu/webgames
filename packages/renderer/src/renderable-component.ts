import type {
  GeometryComponent,
  MaterialComponent,
  Node,
  TransformComponent,
} from "@webgame/engine";
import type { NodeGpuResources } from "./gpu-resources";

export const gpuResourcesComponent = Symbol("gpuResources");

export type RenderableComponent = TransformComponent &
  GeometryComponent &
  MaterialComponent & {
    [gpuResourcesComponent]?: NodeGpuResources;
  };

export function isRenderable(node: Node): node is RenderableComponent {
  return "transform" in node && "geometry" in node && "material" in node;
}
