import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { Node } from "../../../node";
import { setGetter } from "./helpers";
import { createNodeHandle, createNullableNodeHandle } from "./node";

export function createSceneHandle(
  context: QuickJSContext,
  node: Node,
): QuickJSHandle {
  const sceneHandle = context.newObject();

  try {
    setGetter(context, sceneHandle, "root", () => {
      return createNodeHandle(context, getSceneRoot(node));
    });
    setGetter(context, sceneHandle, "attached", () => {
      return createNullableNodeHandle(context, node.parent);
    });

    return sceneHandle;
  } catch (error) {
    sceneHandle.dispose();
    throw error;
  }
}

function getSceneRoot(node: Node): Node {
  let root = node;

  while (root.parent !== null) {
    root = root.parent;
  }

  return root;
}
