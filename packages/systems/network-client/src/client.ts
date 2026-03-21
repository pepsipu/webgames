import { createElement, type Element } from "@webgame/engine";
import {
  dumpScriptValue,
  getScriptService,
  registerScriptable,
  setScriptFunction,
  type Scriptable,
} from "@webgame/script";
import { applyElementSnapshot, type ElementSnapshot } from "@webgame/network";

export type ClientNetworkServiceElement = Element & {
  network: {
    destroyed: boolean;
    pendingSnapshot?: ElementSnapshot;
    socket: WebSocket;
  };
};

const clientNetworkScriptable: Scriptable<ClientNetworkServiceElement> = {
  matches(element: Element): element is ClientNetworkServiceElement {
    return "network" in element && "socket" in (element.network as object);
  },
  installElement(context, elementHandle, element) {
    setScriptFunction(context, elementHandle, "emit", (name, data) => {
      sendClientNetworkEvent(
        element,
        context.getString(name),
        dumpScriptValue(context, data),
      );
    });
  },
};

registerScriptable(clientNetworkScriptable);

export function createClientNetworkService(
  root: Element,
): ClientNetworkServiceElement {
  const element = createElement({
    id: "network",
    network: {
      destroyed: false,
    },
  }) as ClientNetworkServiceElement;

  element.network.socket = createSocket(root, element);
  return element;
}

export function sendClientNetworkEvent(
  element: ClientNetworkServiceElement,
  name: string,
  data: unknown,
): void {
  const socket = element.network.socket;

  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ name, data }));
}

export function applyPendingClientNetworkSnapshot(root: Element): void {
  const service = getClientNetworkService(root);
  const snapshot = service.network.pendingSnapshot;

  if (snapshot === undefined) {
    return;
  }

  delete service.network.pendingSnapshot;
  applyElementSnapshot(root, snapshot, getScriptService(root));
}

export function hasClientNetworkService(
  element: Element,
): element is ClientNetworkServiceElement {
  return "network" in element && "socket" in (element.network as object);
}

export function getClientNetworkService(
  root: Element,
): ClientNetworkServiceElement {
  const service = root.children.find(hasClientNetworkService);

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
    element.network.pendingSnapshot = JSON.parse(String(event.data));
  });
  socket.addEventListener("close", () => {
    if (element.network.destroyed) {
      return;
    }

    applyElementSnapshot(root, { children: [] }, getScriptService(root));
    window.setTimeout(() => {
      if (element.network.destroyed) {
        return;
      }

      element.network.socket = createSocket(root, element);
    }, 100);
  });

  return socket;
}
