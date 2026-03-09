import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  clamp,
  sanitizeChatText,
  type ChatMessage,
  type ClientMessage,
  type PlayerEventMessage,
  type PlayerState,
  type PositionPayload,
  type ServerMessage,
  type WelcomeMessage,
} from "@webgame/shared";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);

const WORLD = Object.freeze({
  min: -120,
  max: 120,
  groundY: 0,
  maxY: 40,
});

interface ClientRecord {
  id: string;
  position: PositionPayload;
}

class WebgameServer {
  private readonly clients = new Map<WebSocket, ClientRecord>();
  private readonly server;
  private readonly webSocketServer;

  constructor(private readonly port: number) {
    this.server = createServer((request, response) =>
      this.handleHttpRequest(request, response),
    );
    this.webSocketServer = new WebSocketServer({ noServer: true });
    this.server.on("upgrade", (request, socket, head) =>
      this.onUpgrade(request, socket, head),
    );
    this.webSocketServer.on("connection", (socket) =>
      this.onConnection(socket),
    );
  }

  listen(): void {
    this.server.listen(this.port, () => {
      console.log(`Server listening on http://localhost:${this.port}`);
    });
  }

  private handleHttpRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): void {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, players: this.clients.size }));
      return;
    }

    response.writeHead(200, { "content-type": "text/plain" });
    response.end("Webgame server is running.");
  }

  private onUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): void {
    const host = request.headers.host ?? "localhost";
    const url = new URL(request.url ?? "/", `http://${host}`);

    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    this.webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      this.webSocketServer.emit("connection", webSocket);
    });
  }

  private onConnection(socket: WebSocket): void {
    const spawn = this.getSpawnPosition(this.clients.size);
    const client: ClientRecord = {
      id: randomUUID().slice(0, 8),
      position: {
        x: spawn.x,
        y: WORLD.groundY,
        z: spawn.z,
        yaw: 0,
      },
    };

    this.clients.set(socket, client);
    this.send(socket, {
      type: "welcome",
      selfPlayerId: client.id,
      players: this.listPlayers(),
    } satisfies WelcomeMessage);
    this.broadcast(
      {
        type: "player:join",
        player: this.toPlayerState(client),
      } satisfies PlayerEventMessage,
      socket,
    );

    socket.on("message", (rawData) =>
      this.handleClientMessage(socket, rawData),
    );

    const onDisconnect = (): void => {
      this.disconnectClient(socket);
    };
    socket.on("close", onDisconnect);
    socket.on("error", onDisconnect);
  }

  private send(socket: WebSocket, payload: ServerMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(payload));
  }

  private broadcast(payload: ServerMessage, excludedSocket?: WebSocket): void {
    const serialized = JSON.stringify(payload);

    for (const socket of this.clients.keys()) {
      if (socket === excludedSocket || socket.readyState !== WebSocket.OPEN) {
        continue;
      }
      socket.send(serialized);
    }
  }

  private handleClientMessage(socket: WebSocket, rawData: RawData): void {
    const sender = this.clients.get(socket);
    if (!sender) {
      return;
    }

    const message = WebgameServer.parseClientMessage(rawData);
    if (!message) {
      return;
    }

    if (message.type === "chat") {
      const text = sanitizeChatText(message.text);
      if (!text) {
        return;
      }

      this.broadcast({
        type: "chat",
        fromPlayerId: sender.id,
        text,
        createdAt: Date.now(),
      } satisfies ChatMessage);
      return;
    }

    const limited = this.applyServerLimits(message);
    sender.position = limited;
    const payload: PlayerEventMessage = {
      type: "player:update",
      player: this.toPlayerState(sender),
    };

    this.broadcast(
      payload,
      this.wasPositionModifiedByServer(message, limited) ? undefined : socket,
    );
  }

  private disconnectClient(socket: WebSocket): void {
    const client = this.clients.get(socket);
    if (!client) {
      return;
    }

    this.clients.delete(socket);
    this.broadcast({ type: "player:leave", playerId: client.id });
  }

  private toPlayerState(client: ClientRecord): PlayerState {
    return {
      id: client.id,
      ...client.position,
    };
  }

  private listPlayers(): PlayerState[] {
    return Array.from(this.clients.values(), (client) =>
      this.toPlayerState(client),
    );
  }

  private normalizeYaw(yaw: number): number {
    const cycle = Math.PI * 2;
    const normalized = yaw % cycle;
    return normalized < 0 ? normalized + cycle : normalized;
  }

  private getSpawnPosition(clientIndex: number): { x: number; z: number } {
    if (clientIndex === 0) {
      return { x: 0, z: 2 };
    }

    const angle = (clientIndex - 1) * 1.47;
    const radius = 5 + ((clientIndex - 1) % 3) * 2;

    return {
      x: clamp(Math.cos(angle) * radius, WORLD.min, WORLD.max),
      z: clamp(2 + Math.sin(angle) * radius, WORLD.min, WORLD.max),
    };
  }

  private applyServerLimits(
    message: Extract<ClientMessage, { type: "position" }>,
  ): PositionPayload {
    return {
      x: clamp(message.x, WORLD.min, WORLD.max),
      y: clamp(message.y, WORLD.groundY, WORLD.maxY),
      z: clamp(message.z, WORLD.min, WORLD.max),
      yaw: this.normalizeYaw(message.yaw),
    };
  }

  private wasPositionModifiedByServer(
    requested: Extract<ClientMessage, { type: "position" }>,
    applied: PositionPayload,
  ): boolean {
    return (
      requested.x !== applied.x ||
      requested.y !== applied.y ||
      requested.z !== applied.z ||
      requested.yaw !== applied.yaw
    );
  }

  private static rawDataToString(rawData: RawData): string {
    if (Array.isArray(rawData)) {
      return Buffer.concat(rawData).toString();
    }

    if (rawData instanceof ArrayBuffer) {
      return Buffer.from(new Uint8Array(rawData)).toString();
    }

    return rawData.toString();
  }

  private static parseClientMessage(rawData: RawData): ClientMessage | null {
    try {
      const parsed = JSON.parse(WebgameServer.rawDataToString(rawData)) as
        | (Partial<ClientMessage> & { type?: unknown })
        | null;

      if (!parsed || typeof parsed.type !== "string") {
        return null;
      }

      if (parsed.type === "chat") {
        return typeof parsed.text === "string"
          ? { type: "chat", text: parsed.text }
          : null;
      }

      if (parsed.type !== "position") {
        return null;
      }

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
        y: Number.isFinite(y) ? y : WORLD.groundY,
        z,
        yaw,
      };
    } catch {
      return null;
    }
  }
}

new WebgameServer(PORT).listen();
