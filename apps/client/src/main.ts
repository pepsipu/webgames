import "./style.css";
import {
  normalizeChatText,
  type ChatMessage,
  type PlayerState,
  type ServerMessage,
  type WelcomeMessage,
} from "@webgame/shared";
import { NETWORK_CONFIG, type NetworkStatus } from "./game/config";
import { ChatBubble } from "./game/chatBubble";
import { InputController } from "./game/input";
import { NetworkClient } from "./game/network";
import { RemotePlayers } from "./game/remotePlayers";
import { Simulation } from "./game/simulation";
import {
  createSceneUi,
  getViewportSize,
  setNetworkStatus,
  showError,
  type SceneUi,
} from "./game/ui";
import { createSceneRenderer, type SceneState } from "./scene/sceneRenderer";

type SceneRenderer = ReturnType<typeof createSceneRenderer>;

class GameClient {
  private readonly input: InputController;
  private readonly network = new NetworkClient();
  private readonly localChat: ChatBubble;
  private readonly remotePlayers: RemotePlayers;
  private localPlayerId: string | null = null;
  private visibleNetworkStatus: NetworkStatus | null = null;
  private sendTimer: number = NETWORK_CONFIG.sendIntervalSeconds;
  private lastTime = performance.now();

  private constructor(
    private readonly scene: SceneState,
    private readonly ui: SceneUi,
    private readonly renderer: SceneRenderer,
    private readonly simulation: Simulation,
  ) {
    this.input = new InputController({
      canvas: this.ui.canvas,
      chatInput: this.ui.chatInput,
    });
    this.localChat = new ChatBubble(this.ui.chatBubble);
    this.remotePlayers = new RemotePlayers(this.ui.remoteLayer);

    this.bindEvents();
    this.updateLayout();
    requestAnimationFrame(this.frame);
  }

  static async create(
    scene: SceneState,
    ui: SceneUi,
    renderer: SceneRenderer,
  ): Promise<GameClient> {
    const simulation = await Simulation.create(scene);
    return new GameClient(scene, ui, renderer, simulation);
  }

  private bindEvents(): void {
    this.ui.chatForm.addEventListener("submit", this.onChatSubmit);

    for (const eventName of ["resize", "orientationchange"] as const) {
      window.addEventListener(eventName, this.updateLayout, { passive: true });
    }
    if ("virtualKeyboard" in navigator) {
      const navWithVK = navigator as {
        virtualKeyboard?: {
          addEventListener: (
            type: "geometrychange",
            listener: EventListenerOrEventListenerObject,
          ) => void;
        };
      };
      navWithVK.virtualKeyboard?.addEventListener(
        "geometrychange",
        this.updateLayout,
      );
    }

    window.addEventListener("beforeunload", this.dispose);
  }

  private readonly onChatSubmit = (event: SubmitEvent): void => {
    event.preventDefault();

    const text = normalizeChatText(this.ui.chatInput.value);
    if (!text) {
      return;
    }

    this.localChat.setMessage(text);
    this.ui.chatInput.value = "";
    this.ui.chatInput.blur();
    this.network.send({ type: "chat", text });
  };

  private readonly updateLayout = (): void => {
    const { width, height } = getViewportSize();
    this.renderer.resize(width, height);
    this.updateBubbles();
  };

  private readonly frame = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.simulation.step(this.input.read(), dt, this.remotePlayers.listForRender());
    this.updateNetwork(dt);
    this.renderer.render(this.remotePlayers.listForRender());
    this.updateBubbles();

    requestAnimationFrame(this.frame);
  };

  private readonly dispose = (): void => {
    this.simulation.dispose();
    this.network.close();
  };

  private updateNetwork(dt: number): void {
    this.updateNetworkStatus();

    for (const message of this.network.pollMessages()) {
      this.handleServerMessage(message);
    }

    this.sendTimer += dt;
    if (this.sendTimer < NETWORK_CONFIG.sendIntervalSeconds) {
      return;
    }

    this.sendTimer = 0;
    this.sendCurrentPosition();
  }

  private updateNetworkStatus(): void {
    const status = this.network.getStatus();
    if (status === this.visibleNetworkStatus) {
      return;
    }

    this.visibleNetworkStatus = status;
    setNetworkStatus(this.ui.networkStatus, status);

    if (status === "connected") {
      this.sendTimer = NETWORK_CONFIG.sendIntervalSeconds;
      this.sendCurrentPosition();
    }
  }

  private sendCurrentPosition(): void {
    this.network.send({
      type: "position",
      ...this.scene.player,
    });
  }

  private updateBubbles(): void {
    this.localChat.project(
      this.renderer.projectWorldToCanvas,
      this.scene.player,
      this.scene.ballRadius,
    );
    this.remotePlayers.updateBubbles(
      this.renderer.projectWorldToCanvas,
      this.scene.ballRadius,
    );
  }

  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case "welcome":
        this.handleWelcome(message);
        return;
      case "player:join":
      case "player:update":
        this.handlePlayer(message.player);
        return;
      case "player:leave":
        this.remotePlayers.remove(message.playerId);
        return;
      case "chat":
        this.handleChat(message);
        return;
    }
  }

  private handleWelcome(message: WelcomeMessage): void {
    this.localPlayerId = message.selfPlayerId;
    this.remotePlayers.replaceAll(message.players, this.localPlayerId);

    const localPlayer = message.players.find(
      (player) => player.id === this.localPlayerId,
    );
    if (!localPlayer) {
      return;
    }

    Object.assign(this.scene.player, localPlayer);
    this.simulation.resetVerticalVelocity();
    this.simulation.syncPlayerPosition();
    this.sendTimer = NETWORK_CONFIG.sendIntervalSeconds;
  }

  private handlePlayer(player: PlayerState): void {
    if (player.id === this.localPlayerId) {
      Object.assign(this.scene.player, player);
      this.simulation.syncPlayerPosition();
      return;
    }

    this.remotePlayers.upsert(player, this.localPlayerId);
  }

  private handleChat(message: ChatMessage): void {
    if (message.fromPlayerId === this.localPlayerId) {
      this.localChat.setMessage(message.text);
      return;
    }

    this.remotePlayers.setMessage(message.fromPlayerId, message.text);
  }
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
    player: {
      x: 0,
      y: 0,
      z: 2,
      yaw: 0,
    },
  };

  const renderer = createSceneRenderer({
    device,
    canvas: ui.canvas,
    format: navigator.gpu.getPreferredCanvasFormat(),
    scene,
  });

  await GameClient.create(scene, ui, renderer);
}

init().catch((error: unknown) => {
  const appRoot = document.querySelector<HTMLElement>("#app");
  if (appRoot) {
    showError(
      appRoot,
      "Failed to initialize WebGPU. Check the console for details.",
    );
  }

  console.error(error);
});
