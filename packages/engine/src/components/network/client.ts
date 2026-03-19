import { createNode, getRootNode, type Node } from "../../node";
import { applyNodeSnapshot } from "./snapshot";
import type { NodeSnapshot } from "./snapshot";

export type ClientNetworkServiceNode = Node & {
  // TODO: network component should not be shared by server and client
  network: {
    destroyed: boolean;
    pendingSnapshot?: NodeSnapshot;
    socket: WebSocket;
  };
};

export function createClientNetworkService(): ClientNetworkServiceNode {
  let node!: ClientNetworkServiceNode;
  const network: ClientNetworkServiceNode["network"] = {
    destroyed: false,
    socket: createSocket(() => {
      return node;
    }),
  };

  node = createNode({ network });

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

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${window.location.host}/ws`;
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

function createSocket(getNode: () => ClientNetworkServiceNode): WebSocket {
  const socket = new WebSocket(getWebSocketUrl());

  socket.addEventListener("message", (event) => {
    getNode().network.pendingSnapshot = JSON.parse(String(event.data));
  });
  socket.addEventListener("close", () => {
    const node = getNode();

    if (node.network.destroyed) {
      return;
    }

    applyNodeSnapshot(getRootNode(node), { children: [] });
    window.setTimeout(() => {
      if (node.network.destroyed) {
        return;
      }

      node.network.socket = createSocket(getNode);
    }, 100);
  });

  return socket;
}
