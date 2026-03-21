import type { Element } from "@webgame/engine";
import {
  registerScriptable,
  setScriptFunction,
  type Scriptable,
} from "@webgame/script";
import type { InputServiceElement } from "./index";

export const inputScriptable: Scriptable<InputServiceElement> = {
  matches(element: Element): element is InputServiceElement {
    return "input" in element;
  },
  installElement(context, elementHandle, element) {
    setScriptFunction(context, elementHandle, "isDown", (code) => {
      return element.input.down.has(context.getString(code))
        ? context.true
        : context.false;
    });

    setScriptFunction(context, elementHandle, "wasPressed", (code) => {
      return element.input.pressed.has(context.getString(code))
        ? context.true
        : context.false;
    });

    setScriptFunction(context, elementHandle, "wasReleased", (code) => {
      return element.input.released.has(context.getString(code))
        ? context.true
        : context.false;
    });
  },
};

registerScriptable(inputScriptable);
