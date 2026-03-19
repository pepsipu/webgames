import { createNode, getRootNode, type Node } from "../../node";
import { createNodeSnapshot } from "./snapshot";

type ClientNetworkEvent = {
  name: string;
  data: unknown;
};

export type ServerNetworkEvent = ClientNetworkEvent & {
  clientId: string;
};

// TODO: remove when moved into separate package
type ServerNetworkSocket = {
  close(): void;
  send(data: string): void;
  on(event: "close", listener: () => void): void;
  on(event: "message", listener: (data: { toString(): string }) => void): void;
};

// TODO: remove when moved into separate package
export interface ServerNetworkSocketServer {
  on(
    event: "connection",
    listener: (socket: ServerNetworkSocket) => void,
  ): void;
}

export type ServerNetworkServiceNode = Node & {
  network: {
    clients: Set<ServerNetworkSocket>;
    incomingEvents: ServerNetworkEvent[];
  };
};

export function createServerNetworkService(): ServerNetworkServiceNode {
  return createNode({
    network: {
      clients: new Set(),
      incomingEvents: [],
    },
  });
}

export function bindServerNetworkSocketServer(
  getScene: () => Node,
  socketServer: ServerNetworkSocketServer,
): void {
  socketServer.on("connection", (socket) => {
    const service = getServerNetworkService(getScene()).network;
    const clientId = crypto.randomUUID();

    service.clients.add(socket);
    socket.send(JSON.stringify(createNodeSnapshot(getRootNode(getScene()))));

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
}

export function pollServerNetworkEvent(
  node: Node,
): ServerNetworkEvent | undefined {
  return getServerNetworkService(node).network.incomingEvents.shift();
}

export function broadcastServerNetworkSnapshot(node: Node): void {
  const service = getServerNetworkService(node).network;
  const snapshot = JSON.stringify(createNodeSnapshot(getRootNode(node)));

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
