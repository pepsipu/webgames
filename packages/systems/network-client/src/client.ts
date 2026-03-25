import { Element, script } from "@webgames/engine";
import { applyElementSnapshot, type ElementSnapshot } from "@webgames/network";

export class ClientNetworkServiceElement extends Element {
  #destroyed: boolean;
  #pendingSnapshot?: ElementSnapshot;
  socket: WebSocket;

  constructor(root: Element) {
    super();
    this.#destroyed = false;
    this.name = "network";
    this.socket = this.#createSocket(root);
  }

  @script()
  emit(name: string, data: unknown): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify({ name, data }));
  }

  applyPendingSnapshot(root: Element): void {
    if (this.#pendingSnapshot === undefined) {
      return;
    }

    const snapshot = this.#pendingSnapshot;

    this.#pendingSnapshot = undefined;
    applyElementSnapshot(root, snapshot);
  }

  destroy(): void {
    this.#destroyed = true;
    this.socket.close();
  }

  #getWebSocketUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    return `${protocol}//${window.location.host}/ws`;
  }

  #createSocket(root: Element): WebSocket {
    const socket = new WebSocket(this.#getWebSocketUrl());

    socket.addEventListener("message", (event) => {
      this.#pendingSnapshot = JSON.parse(String(event.data)) as ElementSnapshot;
    });
    socket.addEventListener("close", () => {
      if (this.#destroyed) {
        return;
      }

      applyElementSnapshot(root, { children: [] });
      window.setTimeout(() => {
        if (this.#destroyed) {
          return;
        }

        this.socket = this.#createSocket(root);
      }, 100);
    });

    return socket;
  }
}
