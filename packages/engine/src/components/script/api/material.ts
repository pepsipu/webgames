import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { Material } from "../../material";
import { setFunction } from "./helpers";

export function createMaterialHandle(
  context: QuickJSContext,
  material: Material,
): QuickJSHandle {
  const materialHandle = context.newObject();

  setFunction(context, materialHandle, "setColor", (r, g, b) => {
    material.setColor(
      context.getNumber(r),
      context.getNumber(g),
      context.getNumber(b),
    );
  });

  return materialHandle;
}
