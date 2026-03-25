import type { Server as HttpServer } from "node:http";
import { Element, script } from "@webgames/engine";
import { createElementSnapshot } from "@webgames/network";
import { WebSocket, WebSocketServer } from "ws";

type ClientNetworkEvent = {
  name: string;
  data: unknown;
};

type ServerNetworkEvent = ClientNetworkEvent & {
  clientId: string;
};

export class ServerNetworkServiceElement extends Element {
  clients: Set<WebSocket>;
  readonly #incomingEvents: ServerNetworkEvent[];
  readonly #socketServer: WebSocketServer;

  constructor(server: HttpServer, root: Element) {
    super();
    this.name = "network";
    this.clients = new Set();
    this.#incomingEvents = [];
    this.#socketServer = this.#createSocketServer(server, root);
  }

  @script()
  pollEvent(): ServerNetworkEvent | undefined {
    return this.#incomingEvents.shift();
  }

  broadcastSnapshot(root: Element): void {
    const snapshot = createElementSnapshot(root);

    for (const socket of this.clients.values()) {
      socket.send(snapshot);
    }
  }

  destroy(): void {
    for (const socket of this.clients) {
      socket.close();
    }

    this.clients.clear();
    this.#socketServer.close();
  }

  #createSocketServer(server: HttpServer, root: Element): WebSocketServer {
    const socketServer = new WebSocketServer({
      server,
      path: "/ws",
    });

    socketServer.on("connection", (socket) => {
      this.#connectClient(root, socket);
    });

    return socketServer;
  }

  #connectClient(root: Element, socket: WebSocket): void {
    const clientId = crypto.randomUUID();

    this.clients.add(socket);
    socket.send(createElementSnapshot(root));

    socket.on("message", (data) => {
      const event = JSON.parse(data.toString()) as ClientNetworkEvent;

      this.#incomingEvents.push({
        clientId,
        name: event.name,
        data: event.data,
      });
    });

    socket.on("close", () => {
      this.clients.delete(socket);
      this.#incomingEvents.push({
        clientId,
        name: "disconnect",
        data: null,
      });
    });
  }
}
