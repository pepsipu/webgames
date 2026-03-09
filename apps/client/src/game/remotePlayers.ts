import type { PlayerState, PositionPayload } from "@webgame/shared";
import type { RemotePlayerRenderState } from "../scene/sceneRenderer";
import { ChatBubble, type ChatBubbleProject } from "./chatBubble";

interface RemotePlayer {
  position: PositionPayload;
  bubble: ChatBubble;
}

export class RemotePlayers {
  private readonly players = new Map<string, RemotePlayer>();

  constructor(private readonly layerElement: HTMLDivElement) {}

  upsert(player: PlayerState, selfId: string | null): void {
    if (player.id === selfId) {
      return;
    }

    this.ensure(player.id).position = player;
  }

  remove(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) {
      return;
    }

    player.bubble.remove();
    this.players.delete(playerId);
  }

  replaceAll(nextPlayers: PlayerState[], selfId: string | null): void {
    const nextIds = new Set<string>();

    for (const player of nextPlayers) {
      if (player.id === selfId) {
        continue;
      }

      nextIds.add(player.id);
      this.upsert(player, selfId);
    }

    for (const playerId of this.players.keys()) {
      if (!nextIds.has(playerId)) {
        this.remove(playerId);
      }
    }
  }

  setMessage(playerId: string, text: string): void {
    this.players.get(playerId)?.bubble.setMessage(text);
  }

  listForRender(): RemotePlayerRenderState[] {
    return Array.from(this.players.values(), ({ position }) => ({
      x: position.x,
      y: position.y,
      z: position.z,
    }));
  }

  updateBubbles(project: ChatBubbleProject, radius: number): void {
    for (const player of this.players.values()) {
      player.bubble.project(project, player.position, radius);
    }
  }

  private ensure(playerId: string): RemotePlayer {
    const existing = this.players.get(playerId);
    if (existing) {
      return existing;
    }

    const element = document.createElement("div");
    element.className = "remote-player-chat hidden";
    this.layerElement.append(element);

    const player: RemotePlayer = {
      position: {
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
      },
      bubble: new ChatBubble(element),
    };

    this.players.set(playerId, player);
    return player;
  }
}
