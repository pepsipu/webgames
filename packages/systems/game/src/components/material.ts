import type { Element } from "@webgame/engine";
import {
  registerScriptable,
  setScriptFunction,
  setScriptGetter,
  type Scriptable,
} from "@webgame/script";
import { Vector3 } from "../math/vector3";

export type Material = Vector3;

export type MaterialComponent = { material: Material };

export function hasMaterial(element: Element): element is Element & MaterialComponent {
  return "material" in element;
}

export function createMaterial(material: Material): Material {
  return Vector3.clone(material);
}

export const materialScriptable: Scriptable<Element & MaterialComponent> = {
  matches: hasMaterial,
  installElement(context, elementHandle, element) {
    setScriptGetter(context, elementHandle, "material", () => {
      const materialHandle = context.newObject();

      setScriptFunction(
        context,
        materialHandle,
        "setColor",
        (r, g, b) => {
          element.material[0] = context.getNumber(r);
          element.material[1] = context.getNumber(g);
          element.material[2] = context.getNumber(b);
        },
      );

      return materialHandle;
    });
  },
};

registerScriptable(materialScriptable);
