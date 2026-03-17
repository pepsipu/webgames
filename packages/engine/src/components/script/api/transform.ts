import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import { Quaternion } from "../../../math/quaternion";
import { Transform } from "../../transform";
import { Vector3 } from "../../../math/vector3";
import { setFunction } from "./helpers";

export function createTransformHandle(
  context: QuickJSContext,
  transform: Transform,
): QuickJSHandle {
  const transformHandle = context.newObject();

  setFunction(context, transformHandle, "setPosition", (x, y, z) => {
    transform.setPosition(
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  setFunction(context, transformHandle, "setRotation", (x, y, z, w) => {
    transform.setRotation(
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
      context.getNumber(w),
    );
  });

  setFunction(context, transformHandle, "setRotationFromEuler", (x, y, z) => {
    transform.setRotationFromEuler(
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  setFunction(context, transformHandle, "setScale", (x, y, z) => {
    transform.setScale(
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  return transformHandle;
}
