import type { ElementRegistry } from "@webgames/engine";
import { Element, type ElementSnapshot } from "@webgames/engine";

export class ClientNetworkServiceElement extends Element {
  static readonly tag: string = "network";
  static readonly replicated: boolean = false;
  static readonly scriptMethods: readonly string[] = ["emit"];

  #destroyed: boolean;
  #pendingSnapshot?: ElementSnapshot;
  socket: WebSocket;

  constructor() {
    super();
    this.#destroyed = false;
    this.name = "network";
    this.socket = this.#createSocket();
  }

  emit(name: string, data: unknown): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify({ name, data }));
  }

  applyPendingSnapshot(registry: ElementRegistry, root: Element): void {
    if (this.#pendingSnapshot === undefined) {
      return;
    }

    const snapshot = this.#pendingSnapshot;

    this.#pendingSnapshot = undefined;
    registry.applySnapshot(root, snapshot);
  }

  destroy(): void {
    this.#destroyed = true;
    this.socket.close();
  }

  #getWebSocketUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    return `${protocol}//${window.location.host}/ws`;
  }

  #createSocket(): WebSocket {
    const socket = new WebSocket(this.#getWebSocketUrl());

    socket.addEventListener("message", (event) => {
      this.#pendingSnapshot = JSON.parse(String(event.data)) as ElementSnapshot;
    });
    socket.addEventListener("close", () => {
      if (this.#destroyed) {
        return;
      }

      this.#pendingSnapshot = {
        tag: "game",
      };
      window.setTimeout(() => {
        if (this.#destroyed) {
          return;
        }

        this.socket = this.#createSocket();
      }, 100);
    });

    return socket;
  }
}
