import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { Node } from "../../../node";
import { getComponent } from "../../component";
import { Material } from "../../material";
import { Transform } from "../../transform";
import { setGetter } from "./helpers";
import { createMaterialHandle } from "./material";
import { createTransformHandle } from "./transform";

export function createNodeHandle(
  context: QuickJSContext,
  node: Node,
): QuickJSHandle {
  const nodeHandle = context.newObject();

  setGetter(context, nodeHandle, "parent", () => {
    return createNullableNodeHandle(context, node.parent);
  });
  setGetter(context, nodeHandle, "children", () => {
    return createChildrenHandle(context, node.children);
  });
  setGetter(context, nodeHandle, "transform", () => {
    const transform = getComponent(node, Transform);

    if (!transform) {
      return context.null;
    }

    return createTransformHandle(context, transform);
  });
  setGetter(context, nodeHandle, "material", () => {
    const material = getComponent(node, Material);

    if (!material) {
      return context.null;
    }

    return createMaterialHandle(context, material);
  });

  return nodeHandle;
}

export function createNullableNodeHandle(
  context: QuickJSContext,
  node: Node | null,
): QuickJSHandle {
  if (node === null) {
    return context.null;
  }

  return createNodeHandle(context, node);
}

function createChildrenHandle(
  context: QuickJSContext,
  children: Node[],
): QuickJSHandle {
  const childrenHandle = context.newArray();

  for (let index = 0; index < children.length; index += 1) {
    const childHandle = createNodeHandle(context, children[index]);

    try {
      context.setProp(childrenHandle, index, childHandle);
    } finally {
      childHandle.dispose();
    }
  }

  return childrenHandle;
}
