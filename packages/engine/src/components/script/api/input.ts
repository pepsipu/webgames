import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { InputServiceNode } from "../../input";
import { setFunction } from "./helpers";

export function addInputServiceMethods(
  context: QuickJSContext,
  nodeHandle: QuickJSHandle,
  node: InputServiceNode,
): void {
  setFunction(context, nodeHandle, "isDown", (code) => {
    return node.input.down.has(context.getString(code))
      ? context.true
      : context.false;
  });

  setFunction(context, nodeHandle, "wasPressed", (code) => {
    return node.input.pressed.has(context.getString(code))
      ? context.true
      : context.false;
  });

  setFunction(context, nodeHandle, "wasReleased", (code) => {
    return node.input.released.has(context.getString(code))
      ? context.true
      : context.false;
  });
}
