import type {
  PlayerState,
  ProjectedPoint,
  RemotePlayerRenderState,
} from "../types";

interface RemotePlayerOverlayState extends RemotePlayerRenderState {
  message: string;
  bubble: HTMLDivElement;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function createBubble(): HTMLDivElement {
  const bubble = document.createElement("div");
  bubble.className = "remote-player-chat hidden";
  return bubble;
}

export function createRemotePlayersOverlay({
  layerElement,
  projectPlayer,
}: {
  layerElement: HTMLDivElement;
  projectPlayer: (player: RemotePlayerRenderState) => ProjectedPoint | null;
}): {
  listPlayers: () => RemotePlayerRenderState[];
  removePlayer: (playerId: string) => void;
  replaceAll: (
    playerList: PlayerState[],
    localPlayerId?: string | null,
  ) => void;
  setMessage: (playerId: string, text: string) => void;
  update: () => void;
  upsertPlayer: (
    player: PlayerState | null,
    localPlayerId?: string | null,
  ) => void;
} {
  const players = new Map<string, RemotePlayerOverlayState>();

  function ensurePlayer(playerId: string): RemotePlayerOverlayState {
    let state = players.get(playerId);
    if (state) {
      return state;
    }

    const bubble = createBubble();
    layerElement.append(bubble);

    state = {
      id: playerId,
      x: 0,
      y: 0,
      z: 0,
      message: "",
      bubble,
    };

    players.set(playerId, state);
    return state;
  }

  function upsertPlayer(
    player: PlayerState | null,
    localPlayerId: string | null = null,
  ): void {
    if (
      !player ||
      typeof player.id !== "string" ||
      player.id === localPlayerId
    ) {
      return;
    }

    const state = ensurePlayer(player.id);
    state.x = toFiniteNumber(player.x, state.x);
    state.y = toFiniteNumber(player.y, state.y);
    state.z = toFiniteNumber(player.z, state.z);
  }

  function setMessage(playerId: string, text: string): void {
    const state = players.get(playerId);
    if (!state) {
      return;
    }

    const message = typeof text === "string" ? text.trim() : "";
    state.message = message;
    state.bubble.textContent = message;
  }

  function removePlayer(playerId: string): void {
    const state = players.get(playerId);
    if (!state) {
      return;
    }

    state.bubble.remove();
    players.delete(playerId);
  }

  function replaceAll(
    playerList: PlayerState[],
    localPlayerId: string | null = null,
  ): void {
    const nextIds = new Set<string>();

    for (const player of playerList) {
      if (
        !player ||
        typeof player.id !== "string" ||
        player.id === localPlayerId
      ) {
        continue;
      }

      nextIds.add(player.id);
      upsertPlayer(player, localPlayerId);
    }

    for (const playerId of players.keys()) {
      if (!nextIds.has(playerId)) {
        removePlayer(playerId);
      }
    }
  }

  function listPlayers(): RemotePlayerRenderState[] {
    return Array.from(players.values(), ({ id, x, y, z }) => ({ id, x, y, z }));
  }

  function update(): void {
    for (const state of players.values()) {
      const projected = state.message ? projectPlayer(state) : null;
      if (projected) {
        state.bubble.style.transform = `translate(-50%, -100%) translate(${projected.x}px, ${projected.y - 10}px)`;
      }
      const visible = projected !== null;

      state.bubble.classList.toggle("hidden", !visible);
      state.bubble.classList.toggle("visible", visible);
    }
  }

  return {
    listPlayers,
    removePlayer,
    replaceAll,
    setMessage,
    update,
    upsertPlayer,
  };
}
