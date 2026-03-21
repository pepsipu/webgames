import type { Element } from "@webgame/engine";
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

export const transformScriptable: Scriptable<Element & TransformComponent> = {
  matches: hasTransform,
  installElement(context, elementHandle, element) {
    setScriptGetter(context, elementHandle, "transform", () => {
      return createTransformHandle(context, element);
    });
  },
};

registerScriptable(transformScriptable);

function createTransformHandle(
  context: QuickJSContext,
  element: Element & TransformComponent,
): QuickJSHandle {
  const transformHandle = context.newObject();

  setScriptFunction(context, transformHandle, "setPosition", (x, y, z) => {
    Vector3.set(
      element.transform.position,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  setScriptFunction(context, transformHandle, "setRotation", (x, y, z, w) => {
    Quaternion.set(
      element.transform.rotation,
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
        element.transform,
        context.getNumber(x),
        context.getNumber(y),
        context.getNumber(z),
      );
    },
  );

  setScriptFunction(context, transformHandle, "setScale", (x, y, z) => {
    Vector3.set(
      element.transform.scale,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  return transformHandle;
}
