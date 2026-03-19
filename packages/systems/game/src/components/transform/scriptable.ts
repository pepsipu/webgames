import type { Node } from "@webgame/engine";
import {
  type QuickJSContext,
  type QuickJSHandle,
  registerScriptable,
  setScriptFunction,
  setScriptGetter,
  type Scriptable,
} from "@webgame/script";
import { Quaternion } from "../../math/quaternion";
import { Vector3 } from "../../math/vector3";
import { hasTransform, type TransformComponent } from "./state";
import { Transform } from "./value";

export const transformScriptable: Scriptable<Node & TransformComponent> = {
  matches: hasTransform,
  installNode(context, nodeHandle, node) {
    setScriptGetter(context, nodeHandle, "transform", () => {
      return createTransformHandle(context, node);
    });
  },
};

registerScriptable(transformScriptable);

function createTransformHandle(
  context: QuickJSContext,
  node: Node & TransformComponent,
): QuickJSHandle {
  const transformHandle = context.newObject();

  setScriptFunction(context, transformHandle, "setPosition", (x, y, z) => {
    Vector3.set(
      node.transform.position,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  setScriptFunction(context, transformHandle, "setRotation", (x, y, z, w) => {
    Quaternion.set(
      node.transform.rotation,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
      context.getNumber(w),
    );
  });

  setScriptFunction(
    context,
    transformHandle,
    "setRotationFromEuler",
    (x, y, z) => {
      Transform.setRotationFromEuler(
        node.transform,
        context.getNumber(x),
        context.getNumber(y),
        context.getNumber(z),
      );
    },
  );

  setScriptFunction(context, transformHandle, "setScale", (x, y, z) => {
    Vector3.set(
      node.transform.scale,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  return transformHandle;
}
