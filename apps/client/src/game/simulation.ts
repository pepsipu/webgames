import { type WebgeLocalPlayerState, WebgeEngine } from "@webgame/webge";
import { MOVEMENT_CONFIG } from "./config";
import type { MoveInput } from "./input";
import type {
  RemotePlayerRenderState,
  SceneState,
} from "../scene/sceneRenderer";

function toLocalPlayerState({
  x,
  y,
  z,
  yaw,
}: {
  x: number;
  y: number;
  z: number;
  yaw: number;
}): WebgeLocalPlayerState {
  return { x, y, z, yaw };
}

export class Simulation {
  private constructor(
    private readonly scene: SceneState,
    private readonly engine: WebgeEngine,
  ) {}

  static async create(scene: SceneState): Promise<Simulation> {
    const engine = await WebgeEngine.create({
      ballRadius: scene.ballRadius,
      moveSpeed: MOVEMENT_CONFIG.moveSpeed,
      orbitSpeed: MOVEMENT_CONFIG.orbitSpeed,
      jumpVelocity: MOVEMENT_CONFIG.jumpVelocity,
      gravity: MOVEMENT_CONFIG.gravity,
      packetCapacity: 512,
      playerStartX: scene.player.x,
      playerStartY: scene.player.y,
      playerStartZ: scene.player.z,
      playerStartYaw: scene.player.yaw,
    });

    const simulation = new Simulation(scene, engine);
    simulation.syncPlayerPosition();
    return simulation;
  }

  dispose(): void {
    this.engine.dispose();
  }

  resetVerticalVelocity(): void {
    this.engine.enqueuePacket({
      type: "sync_local",
      player: toLocalPlayerState(this.scene.player),
      reset_vertical_velocity: true,
    });
  }

  syncPlayerPosition(): void {
    this.engine.enqueuePacket({
      type: "sync_local",
      player: toLocalPlayerState(this.scene.player),
      reset_vertical_velocity: false,
    });
  }

  step(
    input: MoveInput,
    dt: number,
    remotePlayers: readonly RemotePlayerRenderState[],
  ): void {
    this.engine.enqueuePacket({
      type: "local_input",
      input: {
        horizontal: input.horizontal,
        vertical: input.vertical,
        orbit_delta: input.orbitDelta,
        jump_pressed: input.jumpPressed,
      },
    });

    this.engine.enqueuePacket({
      type: "remote_snapshot",
      players: remotePlayers.map((player) => ({
        x: player.x,
        y: player.y,
        z: player.z,
      })),
    });

    const { player } = this.engine.step(dt);
    this.scene.player.x = player.x;
    this.scene.player.y = player.y;
    this.scene.player.z = player.z;
    this.scene.player.yaw = player.yaw;
  }
}
