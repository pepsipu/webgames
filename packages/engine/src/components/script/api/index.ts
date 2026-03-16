import type { QuickJSContext } from "quickjs-emscripten-core";
import type { Node } from "../../../node";
import { setGetter } from "./helpers";
import { createNodeHandle, createNullableNodeHandle } from "./node";

export function exposeScriptApi(context: QuickJSContext, node: Node): void {
  const sceneHandle = context.newObject();

  try {
    setGetter(context, sceneHandle, "root", () => {
      return createNodeHandle(context, getSceneRoot(node));
    });
    setGetter(context, sceneHandle, "attached", () => {
      return createNullableNodeHandle(context, node.parent);
    });

    context.setProp(context.global, "scene", sceneHandle);
  } finally {
    sceneHandle.dispose();
  }
}

function getSceneRoot(node: Node): Node {
  let root = node;

  while (root.parent !== null) {
    root = root.parent;
  }

  return root;
}
