import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { MaterialComponent } from "../../material";
import type { Node } from "../../node";
import { setFunction } from "./helpers";

export function createMaterialHandle(
  context: QuickJSContext,
  node: MaterialComponent,
): QuickJSHandle {
  const materialHandle = context.newObject();

  setFunction(context, materialHandle, "setColor", (r, g, b) => {
    node.material[0] = context.getNumber(r);
    node.material[1] = context.getNumber(g);
    node.material[2] = context.getNumber(b);
  });

  return materialHandle;
}

export function isMaterialComponent(
  node: Node,
): node is Node & MaterialComponent {
  return "material" in node;
}
