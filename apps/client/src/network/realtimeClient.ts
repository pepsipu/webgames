import type {
  ChatMessage,
  NetworkStatus,
  PlayerState,
  PositionPayload,
  RealtimeClient,
  WelcomeMessage,
} from "../types";

export const CONNECTION_STATUS = Object.freeze({
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
} as const);

const RECONNECT_BASE_DELAY_MS = 600;
const RECONNECT_MAX_DELAY_MS = 10_000;

interface RealtimeCallbacks {
  onStatusChange?: (status: NetworkStatus) => void;
  onWelcome?: (message: WelcomeMessage) => void;
  onPlayer?: (player: PlayerState) => void;
  onPlayerLeave?: (playerId: string) => void;
  onChat?: (message: ChatMessage) => void;
}

interface ParsedMessage {
  type: string;
  [key: string]: unknown;
}

function resolveWebSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_WS_URL;
  if (typeof configuredUrl === "string" && configuredUrl.length > 0) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayerState(value: unknown): value is PlayerState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z) &&
    Number.isFinite(value.yaw)
  );
}

function parseMessage(data: unknown): ParsedMessage | null {
  if (typeof data !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    if (!isRecord(parsed) || typeof parsed.type !== "string") {
      return null;
    }

    return parsed as ParsedMessage;
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

    if (message.type === "welcome") {
      if (
        typeof message.selfPlayerId !== "string" ||
        !Array.isArray(message.players)
      ) {
        return;
      }

      const players = message.players.filter(isPlayerState);
      onWelcome?.({
        type: "welcome",
        selfPlayerId: message.selfPlayerId,
        players,
      });
      return;
    }

    if (message.type === "player:join" || message.type === "player:update") {
      if (!isPlayerState(message.player)) {
        return;
      }

      onPlayer?.(message.player);
      return;
    }

    if (message.type === "player:leave") {
      if (typeof message.playerId !== "string") {
        return;
      }

      onPlayerLeave?.(message.playerId);
      return;
    }

    if (message.type === "chat") {
      if (
        typeof message.fromPlayerId !== "string" ||
        typeof message.text !== "string"
      ) {
        return;
      }

      const createdAt = Number.isFinite(message.createdAt)
        ? Number(message.createdAt)
        : undefined;

      onChat?.({
        type: "chat",
        fromPlayerId: message.fromPlayerId,
        text: message.text,
        createdAt,
      });
    }
  }

  function connect(): void {
    clearReconnectTimer();
    if (isClosedByClient) {
      return;
    }

    onStatusChange?.(CONNECTION_STATUS.CONNECTING);
    socket = new WebSocket(socketUrl);

    socket.addEventListener("open", () => {
      reconnectAttempts = 0;
      onStatusChange?.(CONNECTION_STATUS.CONNECTED);
    });

    socket.addEventListener("message", handleMessage);

    socket.addEventListener("close", () => {
      socket = null;

      if (isClosedByClient) {
        return;
      }

      onStatusChange?.(CONNECTION_STATUS.DISCONNECTED);
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
