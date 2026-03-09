import {
  parseJson,
  type ClientMessage,
  type ServerMessage,
} from "@webgame/shared";
import { NETWORK_CONFIG, type NetworkStatus } from "./config";

function resolveWebSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_WS_URL;
  if (typeof configuredUrl === "string" && configuredUrl.length > 0) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
}

export class NetworkClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private isClosedByClient = false;
  private status: NetworkStatus = "connecting";
  private incomingMessages: ServerMessage[] = [];
  private readonly socketUrl = resolveWebSocketUrl();

  constructor() {
    this.connect();
  }

  close(): void {
    this.isClosedByClient = true;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
  }

  getStatus(): NetworkStatus {
    return this.status;
  }

  pollMessages(): ServerMessage[] {
    const next = this.incomingMessages;
    this.incomingMessages = [];
    return next;
  }

  send(message: ClientMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) {
      return;
    }

    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private scheduleReconnect(): void {
    const delayMs = Math.min(
      NETWORK_CONFIG.reconnectMaxDelayMs,
      NETWORK_CONFIG.reconnectBaseDelayMs * 2 ** this.reconnectAttempts,
    );

    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => this.connect(), delayMs);
  }

  private connect(): void {
    this.clearReconnectTimer();
    if (this.isClosedByClient) {
      return;
    }

    this.status = "connecting";
    this.socket = new WebSocket(this.socketUrl);

    this.socket.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.status = "connected";
    });

    this.socket.addEventListener("message", (event) => {
      const message =
        typeof event.data === "string"
          ? parseJson<ServerMessage>(event.data)
          : null;
      if (!message) {
        return;
      }

      this.incomingMessages.push(message);
    });

    this.socket.addEventListener("close", () => {
      this.socket = null;

      if (this.isClosedByClient) {
        return;
      }

      this.status = "disconnected";
      this.scheduleReconnect();
    });

    this.socket.addEventListener("error", () => {
      this.socket?.close();
    });
  }
}
