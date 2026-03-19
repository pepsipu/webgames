import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import { findNodeById, type Node } from "../../../node";
import { hasInputService } from "../../input";
import { hasMaterial } from "../../material";
import { hasTransform } from "../../transform";
import { addInputServiceMethods } from "./input";
import { setFunction, setGetter } from "./helpers";
import { createMaterialHandle } from "./material";
import { createTransformHandle } from "./transform";

// TODO: remove once we can move interface install
type ClientNetworkServiceNode = Node & {
  network: {
    socket: WebSocket;
  };
};

type ServerNetworkEvent = {
  clientId: string;
  name: string;
  data: unknown;
};

type ServerNetworkServiceNode = Node & {
  network: {
    incomingEvents: ServerNetworkEvent[];
  };
};

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

// TODO: remove once we can move interface install. this code is duplicated

function hasClientNetworkService(node: Node): node is ClientNetworkServiceNode {
  return "network" in node && "socket" in (node.network as object);
}

function hasServerNetworkService(node: Node): node is ServerNetworkServiceNode {
  return "network" in node && "incomingEvents" in (node.network as object);
}

function getClientNetworkService(node: Node): ClientNetworkServiceNode {
  const service = findRootNetworkService(node, hasClientNetworkService);

  if (service === undefined) {
    throw new Error("Client network service is not installed.");
  }

  return service;
}

function sendClientNetworkEvent(node: Node, name: string, data: unknown): void {
  const socket = getClientNetworkService(node).network.socket;

  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ name, data }));
}

function pollServerNetworkEvent(node: Node): ServerNetworkEvent | undefined {
  const service = findRootNetworkService(node, hasServerNetworkService);

  if (service === undefined) {
    throw new Error("Server network service is not installed.");
  }

  return service.network.incomingEvents.shift();
}

function findRootNetworkService<T extends Node>(
  node: Node,
  predicate: (candidate: Node) => candidate is T,
): T | undefined {
  let root = node;

  while (root.parent !== null) {
    root = root.parent;
  }

  return root.children.find(predicate);
}
