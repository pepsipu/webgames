import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { Node } from "../../node";
import { setGetter } from "./helpers";
import { createMaterialHandle, isMaterialNode } from "./material";
import { createTransformHandle, isTransformNode } from "./transform";

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
    if (!isTransformNode(node)) {
      return context.null;
    }

    return createTransformHandle(context, node);
  });
  setGetter(context, nodeHandle, "material", () => {
    if (!isMaterialNode(node)) {
      return context.null;
    }

    return createMaterialHandle(context, node);
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
