import type { Server as HttpServer } from "node:http";
import {
  createElement,
  type Element,
} from "@webgame/engine";
import {
  createScriptValueHandle,
  registerScriptable,
  setScriptFunction,
  type Scriptable,
} from "@webgame/script";
import { createElementSnapshot } from "@webgame/network";
import { WebSocket, WebSocketServer } from "ws";

type ClientNetworkEvent = {
  name: string;
  data: unknown;
};

export type ServerNetworkEvent = ClientNetworkEvent & {
  clientId: string;
};

export type ServerNetworkServiceElement = Element & {
  network: {
    clients: Set<WebSocket>;
    incomingEvents: ServerNetworkEvent[];
  };
};

const serverNetworkScriptable: Scriptable<ServerNetworkServiceElement> = {
  matches(element: Element): element is ServerNetworkServiceElement {
    return "network" in element && "incomingEvents" in (element.network as object);
  },
  installElement(context, elementHandle, element) {
    setScriptFunction(context, elementHandle, "pollEvent", () => {
      return createScriptValueHandle(context, pollServerNetworkEvent(element));
    });
  },
};

registerScriptable(serverNetworkScriptable);

export function createServerNetworkService(): ServerNetworkServiceElement {
  return createElement({
    id: "network",
    network: {
      clients: new Set(),
      incomingEvents: [],
    },
  });
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
    const service = serviceElement.network;
    const clientId = crypto.randomUUID();

    service.clients.add(socket);
    socket.send(createElementSnapshot(root));

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
  element: ServerNetworkServiceElement,
): ServerNetworkEvent | undefined {
  return element.network.incomingEvents.shift();
}

export function broadcastServerNetworkSnapshot(root: Element): void {
  const service = getServerNetworkService(root).network;
  const snapshot = createElementSnapshot(root);

  for (const socket of service.clients.values()) {
    socket.send(snapshot);
  }
}

export function disconnectServerNetworkClients(root: Element): void {
  const service = getServerNetworkService(root).network;

  for (const socket of service.clients) {
    socket.close();
  }

  service.clients.clear();
}

export function hasServerNetworkService(
  element: Element,
): element is ServerNetworkServiceElement {
  return "network" in element && "incomingEvents" in (element.network as object);
}

export function getServerNetworkService(root: Element): ServerNetworkServiceElement {
  const service = root.children.find(hasServerNetworkService);

  if (service === undefined) {
    throw new Error("Server network service is not installed.");
  }

  return service;
}
