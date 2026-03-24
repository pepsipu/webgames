import type { Server as HttpServer } from "node:http";
import { Element, script } from "@webgames/engine";
import { createElementSnapshot } from "@webgames/network";
import { WebSocket, WebSocketServer } from "ws";

type ClientNetworkEvent = {
  name: string;
  data: unknown;
};

export type ServerNetworkEvent = ClientNetworkEvent & {
  clientId: string;
};

export class ServerNetworkServiceElement extends Element {
  clients: Set<WebSocket>;
  incomingEvents: ServerNetworkEvent[];

  constructor() {
    super();
    this.name = "network";
    this.clients = new Set();
    this.incomingEvents = [];
  }

  @script()
  pollEvent(): ServerNetworkEvent | undefined {
    return pollServerNetworkEvent(this);
  }
}

export function createServerNetworkService(): ServerNetworkServiceElement {
  return new ServerNetworkServiceElement();
}

export function createServerNetworkSocketServer(
  server: HttpServer,
  root: Element,
  serviceElement: ServerNetworkServiceElement,
): WebSocketServer {
  const socketServer = new WebSocketServer({
    server,
    path: "/ws",
  });

  socketServer.on("connection", (socket) => {
    const clientId = crypto.randomUUID();

    serviceElement.clients.add(socket);
    socket.send(createElementSnapshot(root));

    socket.on("message", (data) => {
      const event = JSON.parse(data.toString()) as ClientNetworkEvent;

      serviceElement.incomingEvents.push({
        clientId,
        name: event.name,
        data: event.data,
      });
    });

    socket.on("close", () => {
      serviceElement.clients.delete(socket);
      serviceElement.incomingEvents.push({
        clientId,
        name: "disconnect",
        data: null,
      });
    });
  });

  return socketServer;
}

export function pollServerNetworkEvent(
  element: ServerNetworkServiceElement,
): ServerNetworkEvent | undefined {
  return element.incomingEvents.shift();
}

export function broadcastServerNetworkSnapshot(root: Element): void {
  const service = getServerNetworkService(root);
  const snapshot = createElementSnapshot(root);

  for (const socket of service.clients.values()) {
    socket.send(snapshot);
  }
}

export function disconnectServerNetworkClients(root: Element): void {
  const service = getServerNetworkService(root);

  for (const socket of service.clients) {
    socket.close();
  }

  service.clients.clear();
}

export function getServerNetworkService(
  root: Element,
): ServerNetworkServiceElement {
  const service = root.children.find(
    (child): child is ServerNetworkServiceElement =>
      child instanceof ServerNetworkServiceElement,
  );

  if (service === undefined) {
    throw new Error("Server network service is not installed.");
  }

  return service;
}
