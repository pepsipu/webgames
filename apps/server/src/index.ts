import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import type {
  ChatMessage,
  ClientMessage,
  PlayerEventMessage,
  PositionPayload,
  PlayerState,
  ServerMessage,
  WelcomeMessage,
} from "@webgame/shared";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const CHAT_LIMIT = 140;
const WORLD_MIN = -120;
const WORLD_MAX = 120;
const WORLD_GROUND_Y = 0;
const WORLD_MAX_Y = 40;
const SOCKET_OPEN_STATE = 1;

type ClientRecord = PlayerState;

const clients = new Map<WebSocket, ClientRecord>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeYaw(yaw: number): number {
  const cycle = Math.PI * 2;
  const normalized = yaw % cycle;
  return normalized < 0 ? normalized + cycle : normalized;
}

function getSpawnPosition(clientIndex: number): { x: number; z: number } {
  if (clientIndex === 0) {
    return { x: 0, z: 2 };
  }

  const angle = (clientIndex - 1) * 1.47;
  const radius = 5 + ((clientIndex - 1) % 3) * 2;

  return {
    x: clamp(Math.cos(angle) * radius, WORLD_MIN, WORLD_MAX),
    z: clamp(2 + Math.sin(angle) * radius, WORLD_MIN, WORLD_MAX),
  };
}

function toPlayerState(client: ClientRecord): PlayerState {
  return {
    id: client.id,
    x: client.x,
    y: client.y,
    z: client.z,
    yaw: client.yaw,
  };
}

function listPlayers(): PlayerState[] {
  return Array.from(clients.values(), toPlayerState);
}

function send(socket: WebSocket, payload: ServerMessage): void {
  if (socket.readyState !== SOCKET_OPEN_STATE) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function broadcast(payload: ServerMessage, excludedSocket: WebSocket | null = null): void {
  const serialized = JSON.stringify(payload);

  for (const socket of clients.keys()) {
    if (socket === excludedSocket || socket.readyState !== SOCKET_OPEN_STATE) {
      continue;
    }

    socket.send(serialized);
  }
}

function rawDataToString(rawData: RawData): string {
  if (Array.isArray(rawData)) {
    return Buffer.concat(rawData).toString();
  }

  if (rawData instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(rawData)).toString();
  }

  return rawData.toString();
}

function parseClientMessage(rawData: RawData): ClientMessage | null {
  try {
    const parsed = JSON.parse(rawDataToString(rawData)) as
      | (Partial<ClientMessage> & { type?: unknown })
      | null;

    if (!parsed || typeof parsed.type !== "string") {
      return null;
    }

    if (parsed.type === "chat") {
      if (typeof parsed.text !== "string") {
        return null;
      }

      return {
        type: "chat",
        text: parsed.text,
      };
    }

    if (parsed.type === "position") {
      const x = Number(parsed.x);
      const y = Number(parsed.y);
      const z = Number(parsed.z);
      const yaw = Number(parsed.yaw);
      if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(yaw)) {
        return null;
      }

      return {
        type: "position",
        x,
        y: Number.isFinite(y) ? y : WORLD_GROUND_Y,
        z,
        yaw,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function sanitizeChat(text: string): string | null {
  const nextText = text.trim().slice(0, CHAT_LIMIT);
  return nextText.length > 0 ? nextText : null;
}

function applyServerLimits(message: Extract<ClientMessage, { type: "position" }>): PositionPayload {
  return {
    x: clamp(message.x, WORLD_MIN, WORLD_MAX),
    y: clamp(message.y, WORLD_GROUND_Y, WORLD_MAX_Y),
    z: clamp(message.z, WORLD_MIN, WORLD_MAX),
    yaw: normalizeYaw(message.yaw),
  };
}

function wasPositionModifiedByServer(
  requested: Extract<ClientMessage, { type: "position" }>,
  applied: PositionPayload,
): boolean {
  return (
    requested.x !== applied.x
    || requested.y !== applied.y
    || requested.z !== applied.z
    || requested.yaw !== applied.yaw
  );
}

function handleClientMessage(socket: WebSocket, rawData: RawData): void {
  const sender = clients.get(socket);
  if (!sender) {
    return;
  }

  const message = parseClientMessage(rawData);
  if (!message) {
    return;
  }

  if (message.type === "chat") {
    const text = sanitizeChat(message.text);
    if (!text) {
      return;
    }

    const payload: ChatMessage = {
      type: "chat",
      fromPlayerId: sender.id,
      text,
      createdAt: Date.now(),
    };

    broadcast(payload);
    return;
  }

  const limited = applyServerLimits(message);
  sender.x = limited.x;
  sender.y = limited.y;
  sender.z = limited.z;
  sender.yaw = limited.yaw;

  const payload: PlayerEventMessage = {
    type: "player:update",
    player: toPlayerState(sender),
  };

  // Send updates to everyone else by default; only echo back to sender when
  // the server had to clamp/normalize the submitted position.
  const wasCorrected = wasPositionModifiedByServer(message, limited);
  broadcast(payload, wasCorrected ? null : socket);
}

function disconnectClient(socket: WebSocket): void {
  const client = clients.get(socket);
  if (!client) {
    return;
  }

  clients.delete(socket);
  broadcast({ type: "player:leave", playerId: client.id });
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, players: clients.size }));
    return;
  }

  response.writeHead(200, { "content-type": "text/plain" });
  response.end("Webgame server is running.");
});

const webSocketServer = new WebSocketServer({ noServer: true });

server.on("upgrade", (request: IncomingMessage, socket, head) => {
  const host = request.headers.host ?? "localhost";
  const url = new URL(request.url ?? "/", `http://${host}`);

  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
    webSocketServer.emit("connection", webSocket);
  });
});

webSocketServer.on("connection", (socket: WebSocket) => {
  const spawn = getSpawnPosition(clients.size);
  const client: ClientRecord = {
    id: randomUUID().slice(0, 8),
    x: spawn.x,
    y: WORLD_GROUND_Y,
    z: spawn.z,
    yaw: 0,
  };

  clients.set(socket, client);

  const welcome: WelcomeMessage = {
    type: "welcome",
    selfPlayerId: client.id,
    players: listPlayers(),
  };
  send(socket, welcome);

  const joinEvent: PlayerEventMessage = {
    type: "player:join",
    player: toPlayerState(client),
  };
  broadcast(joinEvent, socket);

  socket.on("message", (rawData) => {
    handleClientMessage(socket, rawData);
  });

  const onDisconnect = (): void => {
    disconnectClient(socket);
  };

  socket.on("close", onDisconnect);
  socket.on("error", onDisconnect);
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
