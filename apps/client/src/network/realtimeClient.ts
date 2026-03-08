import type {
  ChatMessage,
  NetworkStatus,
  PlayerState,
  PositionPayload,
  RealtimeClient,
  ServerMessage,
  WelcomeMessage,
} from "../types";

const RECONNECT_BASE_DELAY_MS = 600;
const RECONNECT_MAX_DELAY_MS = 10_000;

interface RealtimeCallbacks {
  onStatusChange: (status: NetworkStatus) => void;
  onWelcome: (message: WelcomeMessage) => void;
  onPlayer: (player: PlayerState) => void;
  onPlayerLeave: (playerId: string) => void;
  onChat: (message: ChatMessage) => void;
}

function resolveWebSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_WS_URL;
  if (typeof configuredUrl === "string" && configuredUrl.length > 0) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
}

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

export function createRealtimeClient(
  callbacks: RealtimeCallbacks,
): RealtimeClient {
  const { onStatusChange, onWelcome, onPlayer, onPlayerLeave, onChat } =
    callbacks;

  const socketUrl = resolveWebSocketUrl();

  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let reconnectAttempts = 0;
  let isClosedByClient = false;

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect(): void {
    const delayMs = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempts,
    );

    reconnectAttempts += 1;
    reconnectTimer = window.setTimeout(connect, delayMs);
  }

  function handleMessage(event: MessageEvent): void {
    const message = parseMessage(event.data);
    if (!message) {
      return;
    }

    switch (message.type) {
      case "welcome":
        onWelcome(message);
        return;
      case "player:join":
      case "player:update":
        onPlayer(message.player);
        return;
      case "player:leave":
        onPlayerLeave(message.playerId);
        return;
      case "chat":
        onChat(message);
        return;
    }
  }

  function connect(): void {
    clearReconnectTimer();
    if (isClosedByClient) {
      return;
    }

    onStatusChange("connecting");
    socket = new WebSocket(socketUrl);

    socket.addEventListener("open", () => {
      reconnectAttempts = 0;
      onStatusChange("connected");
    });

    socket.addEventListener("message", handleMessage);

    socket.addEventListener("close", () => {
      socket = null;

      if (isClosedByClient) {
        return;
      }

      onStatusChange("disconnected");
      scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      socket?.close();
    });
  }

  function send(payload: Record<string, unknown>): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(payload));
    return true;
  }

  connect();

  return {
    close(): void {
      isClosedByClient = true;
      clearReconnectTimer();
      socket?.close();
      socket = null;
    },
    sendChat: (text: string): boolean => send({ type: "chat", text }),
    sendPosition: (position: PositionPayload): boolean =>
      send({ type: "position", ...position }),
  };
}
