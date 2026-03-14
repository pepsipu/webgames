import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { Node } from "../../node";
import { setRotationFromEuler, type TransformNode } from "../../transform";
import { setFunction } from "./helpers";

export function createTransformHandle(
  context: QuickJSContext,
  node: TransformNode,
): QuickJSHandle {
  const transformHandle = context.newObject();

  setFunction(context, transformHandle, "setPosition", (x, y, z) => {
    node.transform.position[0] = context.getNumber(x);
    node.transform.position[1] = context.getNumber(y);
    node.transform.position[2] = context.getNumber(z);
  });

  setFunction(context, transformHandle, "setRotation", (x, y, z, w) => {
    node.transform.rotation[0] = context.getNumber(x);
    node.transform.rotation[1] = context.getNumber(y);
    node.transform.rotation[2] = context.getNumber(z);
    node.transform.rotation[3] = context.getNumber(w);
  });

  setFunction(context, transformHandle, "setRotationFromEuler", (x, y, z) => {
    setRotationFromEuler(
      node.transform.rotation,
      context.getNumber(x),
      context.getNumber(y),
      context.getNumber(z),
    );
  });

  setFunction(context, transformHandle, "setScale", (x, y, z) => {
    node.transform.scale[0] = context.getNumber(x);
    node.transform.scale[1] = context.getNumber(y);
    node.transform.scale[2] = context.getNumber(z);
  });

  return transformHandle;
}

export function isTransformNode(node: Node): node is TransformNode {
  return "transform" in node;
}
