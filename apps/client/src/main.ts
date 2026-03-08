import "./style.css";
import { createChatController } from "./chat/chatController";
import { createInputController } from "./controls/inputController";
import { createPositionSync } from "./network/positionSync";
import { createRealtimeClient } from "./network/realtimeClient";
import { createRemotePlayersOverlay } from "./players/remotePlayersOverlay";
import { projectWorldToCanvas } from "./scene/camera";
import { updateMovement } from "./scene/movement";
import { createSceneRenderer } from "./scene/sceneRenderer";
import { createSceneUi } from "./ui/sceneUi";
import type {
  NetworkStatus,
  PlayerState,
  RealtimeClient,
  SceneState,
} from "./types";

const rootElement = document.querySelector<HTMLElement>("#app");
if (!rootElement) {
  throw new Error("Missing #app container element.");
}
const appRoot: HTMLElement = rootElement;

const CONTROL_CONFIG = Object.freeze({
  stickRadiusPx: 72,
  stickDeadZone: 0.16,
  dragOrbitSensitivity: 0.006,
});

const MOVEMENT_TUNING = Object.freeze({
  moveSpeed: 18,
  orbitSpeed: 2.2,
  jumpVelocity: 12,
  gravity: -32,
  minX: -120,
  maxX: 120,
  minZ: -120,
  maxZ: 120,
});

const NETWORK_STATUS_LABELS: Record<NetworkStatus, string> = Object.freeze({
  connecting: "Connecting...",
  connected: "Online",
  disconnected: "Reconnecting...",
});

const CHAT_BUBBLE_HEIGHT_FACTOR = 2.22;

function showError(message: string): void {
  appRoot.innerHTML = `<p class="error">${message}</p>`;
}

function getViewportSize(): { width: number; height: number } {
  if (window.visualViewport) {
    return {
      width: Math.max(1, window.visualViewport.width),
      height: Math.max(1, window.visualViewport.height),
    };
  }

  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
}

function createInitialScene(): SceneState {
  return {
    ballRadius: 0.42,
    ballX: 0,
    ballZ: 2,
    ballY: 0,
    ballVelocityY: 0,
    ballOrientation: new Float32Array([0, 0, 0, 1]),
    cameraYaw: 0,
  };
}

function applyPlayerToScene(scene: SceneState, player: PlayerState): void {
  scene.ballX = player.x;
  scene.ballY = player.y;
  scene.ballZ = player.z;
  scene.cameraYaw = player.yaw;
}

function applyNetworkStatus(
  statusElement: HTMLElement,
  status: NetworkStatus,
): void {
  statusElement.classList.remove("connecting", "connected", "disconnected");
  statusElement.classList.add(status);
  statusElement.textContent = NETWORK_STATUS_LABELS[status];
}

async function init(): Promise<void> {
  if (!navigator.gpu) {
    showError("WebGPU is not available in this browser.");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    showError("No suitable GPU adapter was found.");
    return;
  }

  const device = await adapter.requestDevice();
  const {
    canvas,
    chatBubble,
    chatForm,
    chatInput,
    remoteLayer,
    networkStatus,
  } = createSceneUi(appRoot);

  const scene = createInitialScene();
  const format = navigator.gpu.getPreferredCanvasFormat();
  const renderer = createSceneRenderer({ device, canvas, format, scene });

  const input = createInputController({
    canvas,
    stickRadiusPx: CONTROL_CONFIG.stickRadiusPx,
    stickDeadZone: CONTROL_CONFIG.stickDeadZone,
    dragOrbitSensitivity: CONTROL_CONFIG.dragOrbitSensitivity,
  });

  let localPlayerId: string | null = null;
  let realtimeClient: RealtimeClient | null = null;

  const remotePlayers = createRemotePlayersOverlay({
    layerElement: remoteLayer,
    projectPlayer: (player) => {
      const worldPoint: [number, number, number] = [
        player.x,
        player.y + scene.ballRadius * CHAT_BUBBLE_HEIGHT_FACTOR,
        player.z,
      ];

      return projectWorldToCanvas(worldPoint, scene, canvas);
    },
  });

  const chat = createChatController({
    chatBubble,
    chatForm,
    chatInput,
    projectBubble: () => {
      const worldPoint: [number, number, number] = [
        scene.ballX,
        scene.ballY + scene.ballRadius * CHAT_BUBBLE_HEIGHT_FACTOR,
        scene.ballZ,
      ];

      return projectWorldToCanvas(worldPoint, scene, canvas);
    },
    onSubmit: (text) => {
      realtimeClient?.sendChat(text);
    },
  });

  const positionSync = createPositionSync(scene);

  function updateFrame(dt: number): void {
    updateMovement(scene, MOVEMENT_TUNING, input.getMoveInput(), dt);

    positionSync.update(
      dt,
      scene,
      (payload) => realtimeClient?.sendPosition(payload) ?? false,
    );

    renderer.render(remotePlayers.listPlayers());
    chat.update();
    remotePlayers.update();
  }

  realtimeClient = createRealtimeClient({
    onStatusChange: (status) => {
      applyNetworkStatus(networkStatus, status);
      if (status === "connected") {
        positionSync.forceSend();
      }
    },
    onWelcome: (message) => {
      localPlayerId = message.selfPlayerId;

      remotePlayers.replaceAll(message.players, localPlayerId);
      const localPlayer = message.players.find(
        (player) => player.id === localPlayerId,
      );
      if (localPlayer) {
        applyPlayerToScene(scene, localPlayer);
        scene.ballVelocityY = 0;
        positionSync.resetBaseline(scene);
      }

      positionSync.forceSend();
    },
    onPlayer: (player) => {
      remotePlayers.upsertPlayer(player, localPlayerId);
    },
    onPlayerLeave: (playerId) => {
      remotePlayers.removePlayer(playerId);
    },
    onChat: (message) => {
      if (message.fromPlayerId === localPlayerId) {
        chat.setMessage(message.text);
      } else {
        remotePlayers.setMessage(message.fromPlayerId, message.text);
      }
    },
  });

  const updateLayout = (): void => {
    const { width, height } = getViewportSize();
    renderer.resize(width, height);
    chat.update();
    remotePlayers.update();
  };

  let lastTime = performance.now();
  function frame(now: number): void {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    updateFrame(dt);
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", updateLayout, { passive: true });
  window.addEventListener("orientationchange", updateLayout, { passive: true });
  window.visualViewport?.addEventListener("resize", updateLayout, {
    passive: true,
  });
  window.addEventListener("beforeunload", () => {
    realtimeClient?.close();
  });

  updateLayout();
  updateFrame(0);
  requestAnimationFrame(frame);
}

init().catch((error: unknown) => {
  showError("Failed to initialize WebGPU. Check the console for details.");
  console.error(error);
});
