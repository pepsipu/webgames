import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { Node } from "../node";
import { setRotationFromEuler, type TransformNode } from "../transform";

function setFunction(
  context: QuickJSContext,
  target: QuickJSHandle,
  name: string,
  fn: (this: QuickJSHandle, ...args: QuickJSHandle[]) => QuickJSHandle | void,
): void {
  const handle = context.newFunction(name, fn);

  try {
    context.setProp(target, name, handle);
  } finally {
    handle.dispose();
  }
}

function setGetter(
  context: QuickJSContext,
  target: QuickJSHandle,
  name: string,
  get: (this: QuickJSHandle) => QuickJSHandle,
): void {
  context.defineProp(target, name, {
    configurable: true,
    enumerable: true,
    get,
  });
}

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

function createNodeHandle(context: QuickJSContext, node: Node): QuickJSHandle {
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

  return nodeHandle;
}

function createNullableNodeHandle(
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

function createTransformHandle(
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

function getSceneRoot(node: Node): Node {
  let root = node;

  while (root.parent !== null) {
    root = root.parent;
  }

  return root;
}

function isTransformNode(node: Node): node is TransformNode {
  return "transform" in node;
}
