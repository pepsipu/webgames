import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import { findNodeById, type Node } from "@webgame/engine";
import {
  getNodeScriptables,
  setScriptFunction,
  setScriptGetter,
} from "../scriptable";

export function createNodeHandle(
  context: QuickJSContext,
  node: Node,
): QuickJSHandle {
  const nodeHandle = context.newObject();

  setScriptGetter(context, nodeHandle, "parent", () => {
    return createNullableNodeHandle(context, node.parent);
  });
  setScriptGetter(context, nodeHandle, "children", () => {
    return createChildrenHandle(context, node.children);
  });

  for (const scriptable of getNodeScriptables(node)) {
    scriptable.installNode?.(context, nodeHandle, node);
  }

  // TODO: might be better to have a document component on the root node
  if (node.parent === null) {
    setScriptFunction(context, nodeHandle, "getElementById", (id) => {
      return createNullableNodeHandle(
        context,
        findNodeById(node, context.getString(id)),
      );
    });
  }

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
