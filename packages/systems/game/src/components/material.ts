import type { Node } from "@webgame/engine";
import {
  registerScriptable,
  setScriptFunction,
  setScriptGetter,
  type Scriptable,
} from "@webgame/script";
import { Vector3 } from "../math/vector3";

export type Material = Vector3;

export type MaterialComponent = { material: Material };

export function hasMaterial(node: Node): node is Node & MaterialComponent {
  return "material" in node;
}

export function createMaterial(material: Material): Material {
  return Vector3.clone(material);
}

export const materialScriptable: Scriptable<Node & MaterialComponent> = {
  matches: hasMaterial,
  installNode(context, nodeHandle, node) {
    setScriptGetter(context, nodeHandle, "material", () => {
      const materialHandle = context.newObject();

      setScriptFunction(
        context,
        materialHandle,
        "setColor",
        (r, g, b) => {
          node.material[0] = context.getNumber(r);
          node.material[1] = context.getNumber(g);
          node.material[2] = context.getNumber(b);
        },
      );

      return materialHandle;
    });
  },
};

registerScriptable(materialScriptable);
