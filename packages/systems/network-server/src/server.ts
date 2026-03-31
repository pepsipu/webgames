import type { Server as HttpServer } from "node:http";
import type { ElementRegistry } from "@webgames/engine";
import { Element } from "@webgames/engine";
import { WebSocket, WebSocketServer } from "ws";

type ClientNetworkEvent = {
  name: string;
  data: unknown;
};

type ServerNetworkEvent = ClientNetworkEvent & {
  clientId: string;
};

export class ServerNetworkServiceElement extends Element {
  static readonly tag: string = "network";
  static readonly replicated: boolean = false;
  static readonly scriptMethods: readonly string[] = ["pollEvent"];

  clients: Set<WebSocket>;
  readonly #incomingEvents: ServerNetworkEvent[];
  #socketServer: WebSocketServer | null;

  constructor() {
    super();
    this.clients = new Set();
    this.#incomingEvents = [];
    this.#socketServer = null;
  }

  attach(server: HttpServer, registry: ElementRegistry, root: Element): void {
    this.#socketServer = this.#createSocketServer(server, registry, root);
  }

  pollEvent(): ServerNetworkEvent | undefined {
    return this.#incomingEvents.shift();
  }

  broadcastSnapshot(registry: ElementRegistry, root: Element): void {
    const snapshot = JSON.stringify(registry.getSnapshot(root));

    for (const socket of this.clients.values()) {
      socket.send(snapshot);
    }
  }

  destroy(): void {
    for (const socket of this.clients) {
      socket.close();
    }

    this.clients.clear();
    this.#socketServer?.close();
    this.#socketServer = null;
  }

  #createSocketServer(
    server: HttpServer,
    registry: ElementRegistry,
    root: Element,
  ): WebSocketServer {
    const socketServer = new WebSocketServer({
      server,
      path: "/ws",
    });

    socketServer.on("connection", (socket) => {
      this.#connectClient(registry, root, socket);
    });

    return socketServer;
  }

  #connectClient(
    registry: ElementRegistry,
    root: Element,
    socket: WebSocket,
  ): void {
    const clientId = crypto.randomUUID();

    this.clients.add(socket);
    socket.send(JSON.stringify(registry.getSnapshot(root)));

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
