import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import { findNodeById, type Node } from "../../../node";
import { hasInputService } from "../../input";
import { hasMaterial } from "../../material";
import {
  hasClientNetworkService,
  sendClientNetworkEvent,
} from "../../network/client";
import {
  hasServerNetworkService,
  pollServerNetworkEvent,
} from "../../network/server";
import { hasTransform } from "../../transform";
import { addInputServiceMethods } from "./input";
import { setFunction, setGetter } from "./helpers";
import { createMaterialHandle } from "./material";
import { createTransformHandle } from "./transform";

// TODO: each component should implement their own js interface install, this is pretty complex as-is
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
    if (!hasTransform(node)) {
      return context.null;
    }

    return createTransformHandle(context, node);
  });
  setGetter(context, nodeHandle, "material", () => {
    if (!hasMaterial(node)) {
      return context.null;
    }

    return createMaterialHandle(context, node);
  });
  if (hasInputService(node)) {
    addInputServiceMethods(context, nodeHandle, node);
  }
  // TODO: split network interface
  if (hasClientNetworkService(node) || hasServerNetworkService(node)) {
    addNetworkMethods(context, nodeHandle, node);
  }
  if (node.parent === null) {
    setFunction(context, nodeHandle, "getElementById", (id) => {
      return createNullableNodeHandle(
        context,
        findNodeById(node, context.getString(id)),
      );
    });
    const inputService = node.children.find(hasInputService);
    if (inputService !== undefined) {
      setGetter(context, nodeHandle, "input", () => {
        return createNodeHandle(context, inputService);
      });
    }

    const networkService = node.children.find((child) => {
      return hasClientNetworkService(child) || hasServerNetworkService(child);
    });
    if (networkService !== undefined) {
      setGetter(context, nodeHandle, "network", () => {
        return createNodeHandle(context, networkService);
      });
    }
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

function addNetworkMethods(
  context: QuickJSContext,
  nodeHandle: QuickJSHandle,
  node: Node,
): void {
  if (hasClientNetworkService(node)) {
    setFunction(context, nodeHandle, "emit", (name, data) => {
      sendClientNetworkEvent(
        node,
        context.getString(name),
        dumpNetworkValue(context, data),
      );
    });
    return;
  }

  if (!hasServerNetworkService(node)) {
    return;
  }

  setFunction(context, nodeHandle, "pollEvent", () => {
    return createNetworkValueHandle(context, pollServerNetworkEvent(node));
  });
}

function dumpNetworkValue(
  context: QuickJSContext,
  handle: QuickJSHandle | undefined,
): unknown {
  if (handle === undefined || context.typeof(handle) === "undefined") {
    return null;
  }

  return context.dump(handle);
}

function createNetworkValueHandle(
  context: QuickJSContext,
  value: unknown,
): QuickJSHandle {
  if (value === undefined) {
    return context.undefined;
  }

  if (value === null) {
    return context.null;
  }

  return context.unwrapResult(
    context.evalCode(`(${JSON.stringify(value)})`, "network-value.js"),
  );
}
