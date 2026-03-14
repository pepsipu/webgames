import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { MaterialNode } from "../../material";
import type { Node } from "../../node";
import { setFunction } from "./helpers";

export function createMaterialHandle(
  context: QuickJSContext,
  node: MaterialNode,
): QuickJSHandle {
  const materialHandle = context.newObject();

  setFunction(context, materialHandle, "setColor", (r, g, b) => {
    node.material[0] = context.getNumber(r);
    node.material[1] = context.getNumber(g);
    node.material[2] = context.getNumber(b);
  });

  return materialHandle;
}

export function isMaterialNode(node: Node): node is Node & MaterialNode {
  return "material" in node;
}
