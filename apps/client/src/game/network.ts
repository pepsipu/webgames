import type { ClientMessage, ServerMessage } from "@webgame/shared";
import { NETWORK_CONFIG, type NetworkStatus } from "./config";

function parseMessage(data: unknown): ServerMessage | null {
  if (typeof data !== "string") {
    return null;
  }

  try {
    return JSON.parse(data) as ServerMessage;
  } catch {
    return null;
  }
}

function resolveWebSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_WS_URL;
  if (typeof configuredUrl === "string" && configuredUrl.length > 0) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
}

export function createNetworkClient(): {
  close: () => void;
  getStatus: () => NetworkStatus;
  pollMessages: () => ServerMessage[];
  send: (message: ClientMessage) => boolean;
} {
  const state = {
    socket: null as WebSocket | null,
    reconnectTimer: null as number | null,
    reconnectAttempts: 0,
    isClosedByClient: false,
    status: "connecting" as NetworkStatus,
    incomingMessages: [] as ServerMessage[],
  };

  const socketUrl = resolveWebSocketUrl();

  function clearReconnectTimer(): void {
    if (state.reconnectTimer !== null) {
      window.clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
  }

  function scheduleReconnect(): void {
    const delayMs = Math.min(
      NETWORK_CONFIG.reconnectMaxDelayMs,
      NETWORK_CONFIG.reconnectBaseDelayMs * 2 ** state.reconnectAttempts,
    );

    state.reconnectAttempts += 1;
    state.reconnectTimer = window.setTimeout(connect, delayMs);
  }

  function connect(): void {
    clearReconnectTimer();
    if (state.isClosedByClient) {
      return;
    }

    state.status = "connecting";
    state.socket = new WebSocket(socketUrl);

    state.socket.addEventListener("open", () => {
      state.reconnectAttempts = 0;
      state.status = "connected";
    });

    state.socket.addEventListener("message", (event) => {
      const message = parseMessage(event.data);
      if (!message) {
        return;
      }

      state.incomingMessages.push(message);
    });

    state.socket.addEventListener("close", () => {
      state.socket = null;

      if (state.isClosedByClient) {
        return;
      }

      state.status = "disconnected";
      scheduleReconnect();
    });

    state.socket.addEventListener("error", () => {
      state.socket?.close();
    });
  }

  connect();

  return {
    close(): void {
      state.isClosedByClient = true;
      clearReconnectTimer();
      state.socket?.close();
      state.socket = null;
    },
    getStatus(): NetworkStatus {
      return state.status;
    },
    pollMessages(): ServerMessage[] {
      const next = state.incomingMessages;
      state.incomingMessages = [];
      return next;
    },
    send(message: ClientMessage): boolean {
      if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      state.socket.send(JSON.stringify(message));
      return true;
    },
  };
}
