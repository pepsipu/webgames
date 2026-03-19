import type { Server as HttpServer } from "node:http";
import {
  createNode,
  getRootNode,
  type Node,
} from "@webgame/engine";
import {
  createScriptValueHandle,
  registerScriptable,
  setScriptFunction,
  type Scriptable,
} from "@webgame/script";
import { createNodeSnapshot } from "@webgame/network";
import { WebSocket, WebSocketServer } from "ws";

type ClientNetworkEvent = {
  name: string;
  data: unknown;
};

export type ServerNetworkEvent = ClientNetworkEvent & {
  clientId: string;
};

export type ServerNetworkServiceNode = Node & {
  network: {
    clients: Set<WebSocket>;
    incomingEvents: ServerNetworkEvent[];
  };
};

const serverNetworkScriptable: Scriptable<ServerNetworkServiceNode> = {
  matches(node: Node): node is ServerNetworkServiceNode {
    return "network" in node && "incomingEvents" in (node.network as object);
  },
  installNode(context, nodeHandle, node) {
    setScriptFunction(context, nodeHandle, "pollEvent", () => {
      return createScriptValueHandle(context, pollServerNetworkEvent(node));
    });
  },
};

registerScriptable(serverNetworkScriptable);

export function createServerNetworkService(): ServerNetworkServiceNode {
  return createNode({
    id: "network",
    network: {
      clients: new Set(),
      incomingEvents: [],
    },
  });
}

export function createServerNetworkSocketServer(
  server: HttpServer,
  serviceNode: ServerNetworkServiceNode,
): WebSocketServer {
  const socketServer = new WebSocketServer({
    server,
    path: "/ws",
  });

  socketServer.on("connection", (socket) => {
    const service = serviceNode.network;
    const clientId = crypto.randomUUID();

    service.clients.add(socket);
    socket.send(createNodeSnapshot(getRootNode(serviceNode)));

    socket.on("message", (data) => {
      const event = JSON.parse(data.toString()) as ClientNetworkEvent;

      service.incomingEvents.push({
        clientId,
        name: event.name,
        data: event.data,
      });
    });

    socket.on("close", () => {
      service.clients.delete(socket);
      service.incomingEvents.push({
        clientId,
        name: "disconnect",
        data: null,
      });
    });
  });

  return socketServer;
}

export function pollServerNetworkEvent(
  node: Node,
): ServerNetworkEvent | undefined {
  return getServerNetworkService(node).network.incomingEvents.shift();
}

export function broadcastServerNetworkSnapshot(node: Node): void {
  const service = getServerNetworkService(node).network;
  const snapshot = createNodeSnapshot(getRootNode(node));

  for (const socket of service.clients.values()) {
    socket.send(snapshot);
  }
}

export function disconnectServerNetworkClients(node: Node): void {
  const service = getServerNetworkService(node).network;

  for (const socket of service.clients) {
    socket.close();
  }

  service.clients.clear();
}

export function hasServerNetworkService(
  node: Node,
): node is ServerNetworkServiceNode {
  return "network" in node && "incomingEvents" in (node.network as object);
}

export function getServerNetworkService(node: Node): ServerNetworkServiceNode {
  const service = getRootNode(node).children.find(hasServerNetworkService);

  if (service === undefined) {
    throw new Error("Server network service is not installed.");
  }

  return service;
}
