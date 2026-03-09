import type { PlayerState } from "@webgame/shared";
import type { ProjectedPoint, Vec3 } from "../scene/sceneRenderer";
import { CHAT_BUBBLE_HEIGHT_FACTOR } from "./config";

interface RemotePlayer {
  id: string;
  x: number;
  y: number;
  z: number;
  message: string;
  bubble: HTMLDivElement;
}

function createBubble(): HTMLDivElement {
  const bubble = document.createElement("div");
  bubble.className = "remote-player-chat hidden";
  return bubble;
}

function setBubbleTransform(element: HTMLElement, projected: ProjectedPoint): void {
  element.style.transform = `translate(-50%, -100%) translate(${projected.x}px, ${projected.y - 10}px)`;
}

function setBubbleVisible(element: HTMLElement, visible: boolean): void {
  element.classList.toggle("visible", visible);
  element.classList.toggle("hidden", !visible);
}

export function createRemotePlayers(layerElement: HTMLDivElement): {
  listForRender: () => Array<{ x: number; y: number; z: number }>;
  remove: (playerId: string) => void;
  replaceAll: (players: PlayerState[], selfId: string | null) => void;
  setMessage: (playerId: string, text: string) => void;
  updateBubbles: (
    project: (world: Vec3) => ProjectedPoint | null,
    radius: number,
  ) => void;
  upsert: (player: PlayerState, selfId: string | null) => void;
} {
  const players = new Map<string, RemotePlayer>();

  function ensure(playerId: string): RemotePlayer {
    const existing = players.get(playerId);
    if (existing) {
      return existing;
    }

    const player: RemotePlayer = {
      id: playerId,
      x: 0,
      y: 0,
      z: 0,
      message: "",
      bubble: createBubble(),
    };

    layerElement.append(player.bubble);
    players.set(playerId, player);
    return player;
  }

  function upsert(player: PlayerState, selfId: string | null): void {
    if (player.id === selfId) {
      return;
    }

    const remote = ensure(player.id);
    remote.x = player.x;
    remote.y = player.y;
    remote.z = player.z;
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

    player.message = text.trim();
    player.bubble.textContent = player.message;
  }

  function listForRender(): Array<{ x: number; y: number; z: number }> {
    return Array.from(players.values(), ({ x, y, z }) => ({ x, y, z }));
  }

  function updateBubbles(
    project: (world: Vec3) => ProjectedPoint | null,
    radius: number,
  ): void {
    for (const player of players.values()) {
      const projected = player.message
        ? project([
            player.x,
            player.y + radius * CHAT_BUBBLE_HEIGHT_FACTOR,
            player.z,
          ])
        : null;

      if (projected) {
        setBubbleTransform(player.bubble, projected);
      }

      setBubbleVisible(player.bubble, projected !== null);
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
