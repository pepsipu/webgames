import "./style.css";
import type {
  ChatMessage,
  ClientMessage,
  PlayerState,
  PositionPayload,
  ServerMessage,
  WelcomeMessage,
} from "@webgame/shared";
import {
  CHAT_BUBBLE_HEIGHT_FACTOR,
  NETWORK_CONFIG,
  type NetworkStatus,
} from "./game/config";
import { createInputController } from "./game/input";
import { createLocalChat } from "./game/localChat";
import { createNetworkClient } from "./game/network";
import { createRemotePlayers } from "./game/remotePlayers";
import { createSimulation } from "./game/simulation";
import {
  createSceneUi,
  getViewportSize,
  setNetworkStatus,
  showError,
} from "./game/ui";
import { createSceneRenderer, type SceneState, type Vec3 } from "./scene/sceneRenderer";

function bubblePoint(position: { x: number; y: number; z: number }, radius: number): Vec3 {
  return [position.x, position.y + radius * CHAT_BUBBLE_HEIGHT_FACTOR, position.z];
}

function applyPlayerToScene(scene: SceneState, player: PositionPayload): void {
  scene.ballX = player.x;
  scene.ballY = player.y;
  scene.ballZ = player.z;
  scene.cameraYaw = player.yaw;
}

async function init(): Promise<void> {
  const appRoot = document.querySelector<HTMLElement>("#app");
  if (!appRoot) {
    throw new Error("Missing #app container element.");
  }

  if (!navigator.gpu) {
    showError(appRoot, "WebGPU is not available in this browser.");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    showError(appRoot, "No suitable GPU adapter was found.");
    return;
  }

  const ui = createSceneUi(appRoot);
  const device = await adapter.requestDevice();

  const scene: SceneState = {
    ballRadius: 0.42,
    ballX: 0,
    ballY: 0,
    ballZ: 2,
    cameraYaw: 0,
  };

  const renderer = createSceneRenderer({
    device,
    canvas: ui.canvas,
    format: navigator.gpu.getPreferredCanvasFormat(),
    scene,
  });

  const input = createInputController({
    canvas: ui.canvas,
    chatInput: ui.chatInput,
  });

  const simulation = createSimulation(scene);
  const network = createNetworkClient();
  const localChat = createLocalChat(ui.chatBubble);
  const remotePlayers = createRemotePlayers(ui.remoteLayer);

  let localPlayerId: string | null = null;
  let visibleNetworkStatus: NetworkStatus | null = null;
  let sendTimer: number = NETWORK_CONFIG.sendIntervalSeconds;

  function send(message: ClientMessage): boolean {
    return network.send(message);
  }

  function sendCurrentPosition(): void {
    send({
      type: "position",
      x: scene.ballX,
      y: scene.ballY,
      z: scene.ballZ,
      yaw: scene.cameraYaw,
    });
  }

  function handleWelcome(message: WelcomeMessage): void {
    localPlayerId = message.selfPlayerId;
    remotePlayers.replaceAll(message.players, localPlayerId);

    const localPlayer = message.players.find(
      (player) => player.id === localPlayerId,
    );

    if (localPlayer) {
      applyPlayerToScene(scene, localPlayer);
      simulation.resetVerticalVelocity();
    }

    sendTimer = NETWORK_CONFIG.sendIntervalSeconds;
  }

  function handlePlayer(player: PlayerState): void {
    if (player.id === localPlayerId) {
      applyPlayerToScene(scene, player);
      return;
    }

    remotePlayers.upsert(player, localPlayerId);
  }

  function handleChat(message: ChatMessage): void {
    if (message.fromPlayerId === localPlayerId) {
      localChat.setMessage(message.text);
      return;
    }

    remotePlayers.setMessage(message.fromPlayerId, message.text);
  }

  function handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case "welcome":
        handleWelcome(message);
        return;
      case "player:join":
      case "player:update":
        handlePlayer(message.player);
        return;
      case "player:leave":
        remotePlayers.remove(message.playerId);
        return;
      case "chat":
        handleChat(message);
        return;
    }
  }

  function updateNetworkStatus(): void {
    const nextStatus = network.getStatus();
    if (nextStatus === visibleNetworkStatus) {
      return;
    }

    visibleNetworkStatus = nextStatus;
    setNetworkStatus(ui.networkStatus, nextStatus);

    if (nextStatus === "connected") {
      sendTimer = NETWORK_CONFIG.sendIntervalSeconds;
      sendCurrentPosition();
    }
  }

  function updateNetwork(dt: number): void {
    updateNetworkStatus();

    for (const message of network.pollMessages()) {
      handleServerMessage(message);
    }

    sendTimer += dt;
    if (sendTimer < NETWORK_CONFIG.sendIntervalSeconds) {
      return;
    }

    sendTimer = 0;
    sendCurrentPosition();
  }

  function updateBubbles(): void {
    const projected = localChat.getMessage()
      ? renderer.projectWorldToCanvas(
          bubblePoint(
            { x: scene.ballX, y: scene.ballY, z: scene.ballZ },
            scene.ballRadius,
          ),
        )
      : null;

    localChat.update(projected);
    remotePlayers.updateBubbles(renderer.projectWorldToCanvas, scene.ballRadius);
  }

  function updateLayout(): void {
    const { width, height } = getViewportSize();
    renderer.resize(width, height);
    updateBubbles();
  }

  ui.chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = ui.chatInput.value.trim();
    if (!text) {
      return;
    }

    localChat.setMessage(text);
    ui.chatInput.value = "";
    ui.chatInput.blur();

    send({ type: "chat", text });
  });

  window.addEventListener("resize", updateLayout, { passive: true });
  window.addEventListener("orientationchange", updateLayout, { passive: true });
  window.visualViewport?.addEventListener("resize", updateLayout, {
    passive: true,
  });

  window.addEventListener("beforeunload", () => {
    network.close();
  });

  updateLayout();

  let lastTime = performance.now();
  function frame(now: number): void {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    simulation.step(input.read(), dt);
    updateNetwork(dt);
    renderer.render(remotePlayers.listForRender());
    updateBubbles();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

init().catch((error: unknown) => {
  const appRoot = document.querySelector<HTMLElement>("#app");
  if (appRoot) {
    showError(appRoot, "Failed to initialize WebGPU. Check the console for details.");
  }

  console.error(error);
});
