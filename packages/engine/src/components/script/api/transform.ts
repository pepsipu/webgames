import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import { Quaternion } from "../../../math/quaternion";
import { Transform } from "../../transform";
import { Vector3 } from "../../../math/vector3";
import type { TransformComponent } from "../../transform";
import { setFunction } from "./helpers";

export function createTransformHandle(
  context: QuickJSContext,
  node: TransformComponent,
): QuickJSHandle {
  const transformHandle = context.newObject();

  setFunction(context, transformHandle, "setPosition", (x, y, z) => {
    Vector3.set(
      node.transform.position,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  setFunction(context, transformHandle, "setRotation", (x, y, z, w) => {
    Quaternion.set(
      node.transform.rotation,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
      context.getNumber(w),
    );
  });

  setFunction(context, transformHandle, "setRotationFromEuler", (x, y, z) => {
    Transform.setRotationFromEuler(
      node.transform,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  setFunction(context, transformHandle, "setScale", (x, y, z) => {
    Vector3.set(
      node.transform.scale,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  return transformHandle;
}
