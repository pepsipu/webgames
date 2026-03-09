import type { PlayerState, PositionPayload } from "@webgame/shared";
import type { RemotePlayerRenderState } from "../scene/sceneRenderer";
import {
  createChatBubble,
  type ChatBubbleProject,
  updateProjectedChatBubble,
} from "./chatBubble";

interface RemotePlayer {
  position: PositionPayload;
  bubble: ReturnType<typeof createChatBubble>;
}

export function createRemotePlayers(layerElement: HTMLDivElement): {
  listForRender: () => RemotePlayerRenderState[];
  remove: (playerId: string) => void;
  replaceAll: (players: PlayerState[], selfId: string | null) => void;
  setMessage: (playerId: string, text: string) => void;
  updateBubbles: (project: ChatBubbleProject, radius: number) => void;
  upsert: (player: PlayerState, selfId: string | null) => void;
} {
  const players = new Map<string, RemotePlayer>();

  function ensure(playerId: string): RemotePlayer {
    const existing = players.get(playerId);
    if (existing) {
      return existing;
    }

    const element = document.createElement("div");
    element.className = "remote-player-chat hidden";
    layerElement.append(element);

    const player: RemotePlayer = {
      position: {
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
      },
      bubble: createChatBubble(element),
    };

    players.set(playerId, player);
    return player;
  }

  function upsert(player: PlayerState, selfId: string | null): void {
    if (player.id === selfId) {
      return;
    }

    const remote = ensure(player.id);
    remote.position = player;
  }

  function remove(playerId: string): void {
    const player = players.get(playerId);
    if (!player) {
      return;
    }

    player.bubble.remove();
    players.delete(playerId);
  }

  function replaceAll(nextPlayers: PlayerState[], selfId: string | null): void {
    const nextIds = new Set<string>();

    for (const player of nextPlayers) {
      if (player.id === selfId) {
        continue;
      }

      nextIds.add(player.id);
      upsert(player, selfId);
    }

    for (const playerId of Array.from(players.keys())) {
      if (!nextIds.has(playerId)) {
        remove(playerId);
      }
    }
  }

  function setMessage(playerId: string, text: string): void {
    const player = players.get(playerId);
    if (!player) {
      return;
    }

    player.bubble.setMessage(text);
  }

  function listForRender(): RemotePlayerRenderState[] {
    return Array.from(players.values(), ({ position }) => ({
      x: position.x,
      y: position.y,
      z: position.z,
    }));
  }

  function updateBubbles(project: ChatBubbleProject, radius: number): void {
    for (const player of players.values()) {
      updateProjectedChatBubble(
        player.bubble,
        project,
        player.position,
        radius,
      );
    }
  }

  return {
    listForRender,
    remove,
    replaceAll,
    setMessage,
    updateBubbles,
    upsert,
  };
}
