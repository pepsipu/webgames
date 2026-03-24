import { Element, script } from "@webgames/engine";
import { applyElementSnapshot, type ElementSnapshot } from "@webgames/network";

export class ClientNetworkServiceElement extends Element {
  destroyed: boolean;
  pendingSnapshot?: ElementSnapshot;
  socket: WebSocket;

  constructor(root: Element) {
    super();
    this.name = "network";
    this.destroyed = false;
    this.socket = createSocket(root, this);
  }

  @script()
  emit(name: string, data: unknown): void {
    sendClientNetworkEvent(this, name, data);
  }
}

export function createClientNetworkService(
  root: Element,
): ClientNetworkServiceElement {
  return new ClientNetworkServiceElement(root);
}

export function sendClientNetworkEvent(
  element: ClientNetworkServiceElement,
  name: string,
  data: unknown,
): void {
  const socket = element.socket;

  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ name, data }));
}

export function applyPendingClientNetworkSnapshot(root: Element): void {
  const service = getClientNetworkService(root);
  const snapshot = service.pendingSnapshot;

  if (snapshot === undefined) {
    return;
  }

  delete service.pendingSnapshot;
  applyElementSnapshot(root, snapshot);
}

export function getClientNetworkService(
  root: Element,
): ClientNetworkServiceElement {
  const service = root.children.find(
    (child): child is ClientNetworkServiceElement =>
      child instanceof ClientNetworkServiceElement,
  );

  if (service === undefined) {
    throw new Error("Client network service is not installed.");
  }

  return service;
}

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${window.location.host}/ws`;
}

function createSocket(
  root: Element,
  element: ClientNetworkServiceElement,
): WebSocket {
  const socket = new WebSocket(getWebSocketUrl());

  socket.addEventListener("message", (event) => {
    element.pendingSnapshot = JSON.parse(String(event.data));
  });
  socket.addEventListener("close", () => {
    if (element.destroyed) {
      return;
    }

    applyElementSnapshot(root, { children: [] });
    window.setTimeout(() => {
      if (element.destroyed) {
        return;
      }

      element.socket = createSocket(root, element);
    }, 100);
  });

  return socket;
}
