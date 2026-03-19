import {
  createNode,
  getRootNode,
  type Node,
} from "@webgame/engine";
import {
  dumpScriptValue,
  registerScriptable,
  setScriptFunction,
  type Scriptable,
} from "@webgame/script";
import { applyNodeSnapshot, type NodeSnapshot } from "@webgame/network";

export type ClientNetworkServiceNode = Node & {
  network: {
    destroyed: boolean;
    pendingSnapshot?: NodeSnapshot;
    socket: WebSocket;
  };
};

const clientNetworkScriptable: Scriptable<ClientNetworkServiceNode> = {
  matches(node: Node): node is ClientNetworkServiceNode {
    return "network" in node && "socket" in (node.network as object);
  },
  installNode(context, nodeHandle, node) {
    setScriptFunction(context, nodeHandle, "emit", (name, data) => {
      sendClientNetworkEvent(
        node,
        context.getString(name),
        dumpScriptValue(context, data),
      );
    });
  },
};

registerScriptable(clientNetworkScriptable);

export function createClientNetworkService(): ClientNetworkServiceNode {
  const node = createNode({
    id: "network",
    network: {
      destroyed: false,
    },
  }) as ClientNetworkServiceNode;

  node.network.socket = createSocket(node);
  return node;
}

export function sendClientNetworkEvent(
  node: Node,
  name: string,
  data: unknown,
): void {
  const socket = getClientNetworkService(node).network.socket;

  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ name, data }));
}

export function applyPendingClientNetworkSnapshot(node: Node): void {
  const service = getClientNetworkService(node);
  const snapshot = service.network.pendingSnapshot;

  if (snapshot === undefined) {
    return;
  }

  delete service.network.pendingSnapshot;
  applyNodeSnapshot(getRootNode(node), snapshot);
}

export function hasClientNetworkService(
  node: Node,
): node is ClientNetworkServiceNode {
  return "network" in node && "socket" in (node.network as object);
}

export function getClientNetworkService(node: Node): ClientNetworkServiceNode {
  const service = getRootNode(node).children.find(hasClientNetworkService);

  if (service === undefined) {
    throw new Error("Client network service is not installed.");
  }

  return service;
}

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${window.location.host}/ws`;
}

function createSocket(node: ClientNetworkServiceNode): WebSocket {
  const socket = new WebSocket(getWebSocketUrl());

  socket.addEventListener("message", (event) => {
    node.network.pendingSnapshot = JSON.parse(String(event.data));
  });
  socket.addEventListener("close", () => {
    if (node.network.destroyed) {
      return;
    }

    applyNodeSnapshot(getRootNode(node), { children: [] });
    window.setTimeout(() => {
      if (node.network.destroyed) {
        return;
      }

      node.network.socket = createSocket(node);
    }, 100);
  });

  return socket;
}
