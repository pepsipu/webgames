import type { Node } from "@webgame/engine";
import {
  registerScriptable,
  setScriptFunction,
  type Scriptable,
} from "@webgame/script";
import type { InputServiceNode } from "./index";

export const inputScriptable: Scriptable<InputServiceNode> = {
  matches(node: Node): node is InputServiceNode {
    return "input" in node;
  },
  installNode(context, nodeHandle, node) {
    setScriptFunction(context, nodeHandle, "isDown", (code) => {
      return node.input.down.has(context.getString(code))
        ? context.true
        : context.false;
    });

    setScriptFunction(context, nodeHandle, "wasPressed", (code) => {
      return node.input.pressed.has(context.getString(code))
        ? context.true
        : context.false;
    });

    setScriptFunction(context, nodeHandle, "wasReleased", (code) => {
      return node.input.released.has(context.getString(code))
        ? context.true
        : context.false;
    });
  },
};

registerScriptable(inputScriptable);
