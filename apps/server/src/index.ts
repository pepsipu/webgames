import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { WebSocketServer, type RawData, type WebSocket } from "ws";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const CHAT_LIMIT = 140;
const WORLD_MIN = -120;
const WORLD_MAX = 120;
const WORLD_GROUND_Y = 0;
const WORLD_MAX_Y = 40;
const SOCKET_OPEN_STATE = 1;

const MESSAGE_TYPE = Object.freeze({
  WELCOME: "welcome",
  POSITION: "position",
  CHAT: "chat",
  PLAYER_JOIN: "player:join",
  PLAYER_UPDATE: "player:update",
  PLAYER_LEAVE: "player:leave",
} as const);

interface PlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  updatedAt: number;
}

type ClientPositionPayload = {
  type: typeof MESSAGE_TYPE.POSITION;
  x?: unknown;
  y?: unknown;
  z?: unknown;
  yaw?: unknown;
};

type ClientChatPayload = {
  type: typeof MESSAGE_TYPE.CHAT;
  text?: unknown;
};

type ClientPayload = ClientPositionPayload | ClientChatPayload;

type WelcomePayload = {
  type: typeof MESSAGE_TYPE.WELCOME;
  selfPlayerId: string;
  players: PlayerState[];
};

type PlayerJoinPayload = {
  type: typeof MESSAGE_TYPE.PLAYER_JOIN;
  player: PlayerState;
};

type PlayerUpdatePayload = {
  type: typeof MESSAGE_TYPE.PLAYER_UPDATE;
  player: PlayerState;
};

type PlayerLeavePayload = {
  type: typeof MESSAGE_TYPE.PLAYER_LEAVE;
  playerId: string;
};

type ChatPayload = {
  type: typeof MESSAGE_TYPE.CHAT;
  fromPlayerId: string;
  text: string;
  createdAt: number;
};

type ServerPayload =
  | WelcomePayload
  | PlayerJoinPayload
  | PlayerUpdatePayload
  | PlayerLeavePayload
  | ChatPayload;

const app = new Hono();
const playersById = new Map<string, PlayerState>();
const playerIdBySocket = new Map<WebSocket, string>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeYaw(yaw: number): number {
  const cycle = Math.PI * 2;
  const normalized = yaw % cycle;
  return normalized < 0 ? normalized + cycle : normalized;
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

function parseClientMessage(rawData: RawData): ClientPayload | null {
  try {
    const parsed = JSON.parse(rawDataToString(rawData)) as
      | ClientPayload
      | { type?: unknown }
      | null;

    switch (parsed?.type) {
      case MESSAGE_TYPE.POSITION:
        return parsed as ClientPositionPayload;
      case MESSAGE_TYPE.CHAT:
        return parsed as ClientChatPayload;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function broadcast(
  payload: ServerPayload,
  excludedPlayerId: string | null = null,
): void {
  const serialized = JSON.stringify(payload);

  for (const [socket, playerId] of playerIdBySocket.entries()) {
    if (
      playerId === excludedPlayerId ||
      socket.readyState !== SOCKET_OPEN_STATE
    ) {
      continue;
    }

    socket.send(serialized);
  }
}

function getSpawnPosition(playerIndex: number): { x: number; z: number } {
  if (playerIndex === 0) {
    return { x: 0, z: 2 };
  }

  const angle = (playerIndex - 1) * 1.47;
  const radius = 5 + ((playerIndex - 1) % 3) * 2;

  return {
    x: clamp(Math.cos(angle) * radius, WORLD_MIN, WORLD_MAX),
    z: clamp(2 + Math.sin(angle) * radius, WORLD_MIN, WORLD_MAX),
  };
}

function createPlayerState(id: string, playerIndex: number): PlayerState {
  const spawn = getSpawnPosition(playerIndex);

  return {
    id,
    x: spawn.x,
    y: WORLD_GROUND_Y,
    z: spawn.z,
    yaw: 0,
    updatedAt: Date.now(),
  };
}

function readPosition(
  payload: ClientPositionPayload,
  player: PlayerState,
): Omit<PlayerState, "id" | "updatedAt"> | null {
  const x = Number(payload.x);
  const y = Number(payload.y);
  const z = Number(payload.z);
  const yaw = Number(payload.yaw);
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(yaw)) {
    return null;
  }

  return {
    x: clamp(x, WORLD_MIN, WORLD_MAX),
    y: clamp(Number.isFinite(y) ? y : player.y, WORLD_GROUND_Y, WORLD_MAX_Y),
    z: clamp(z, WORLD_MIN, WORLD_MAX),
    yaw: normalizeYaw(yaw),
  };
}

function readChat(payload: ClientChatPayload): string | null {
  if (typeof payload.text !== "string") {
    return null;
  }

  const text = payload.text.trim().slice(0, CHAT_LIMIT);
  return text.length > 0 ? text : null;
}

function handleClientMessage(socket: WebSocket, rawData: RawData): void {
  const payload = parseClientMessage(rawData);
  if (!payload) {
    return;
  }

  const playerId = playerIdBySocket.get(socket);
  const player = playerId ? playersById.get(playerId) : null;
  if (!playerId || !player) {
    return;
  }

  switch (payload.type) {
    case MESSAGE_TYPE.POSITION: {
      const nextPosition = readPosition(payload, player);
      if (!nextPosition) {
        return;
      }

      Object.assign(player, nextPosition, { updatedAt: Date.now() });
      broadcast({ type: MESSAGE_TYPE.PLAYER_UPDATE, player }, playerId);
      return;
    }
    case MESSAGE_TYPE.CHAT: {
      const text = readChat(payload);
      if (!text) {
        return;
      }

      broadcast({
        type: MESSAGE_TYPE.CHAT,
        fromPlayerId: playerId,
        text,
        createdAt: Date.now(),
      });
      return;
    }
  }
}

function disconnectSocket(socket: WebSocket): void {
  const playerId = playerIdBySocket.get(socket);
  if (!playerId) {
    return;
  }

  playerIdBySocket.delete(socket);

  if (playersById.delete(playerId)) {
    broadcast({
      type: MESSAGE_TYPE.PLAYER_LEAVE,
      playerId,
    });
  }
}

app.get("/", (context) => context.text("Webgame server is running."));
app.get("/health", (context) =>
  context.json({ ok: true, players: playersById.size }),
);

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info: { port: number }) => {
    console.log(`Hono server listening on http://localhost:${info.port}`);
  },
);

const webSocketServer = new WebSocketServer({ noServer: true });

server.on(
  "upgrade",
  (request: IncomingMessage, socket: Socket, head: Buffer) => {
    const host = request.headers.host ?? "localhost";
    const url = new URL(request.url ?? "/", `http://${host}`);

    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    webSocketServer.handleUpgrade(
      request,
      socket,
      head,
      (webSocket: WebSocket) => {
        webSocketServer.emit("connection", webSocket);
      },
    );
  },
);

webSocketServer.on("connection", (socket: WebSocket) => {
  const playerId = randomUUID().slice(0, 8);
  const player = createPlayerState(playerId, playersById.size);

  playersById.set(playerId, player);
  playerIdBySocket.set(socket, playerId);

  if (socket.readyState === SOCKET_OPEN_STATE) {
    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPE.WELCOME,
        selfPlayerId: playerId,
        players: Array.from(playersById.values()),
      }),
    );
  }

  broadcast(
    {
      type: MESSAGE_TYPE.PLAYER_JOIN,
      player,
    },
    playerId,
  );

  socket.on("message", (data) => {
    handleClientMessage(socket, data);
  });

  const handleDisconnect = (): void => disconnectSocket(socket);
  socket.on("close", handleDisconnect);
  socket.on("error", handleDisconnect);
});
