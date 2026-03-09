import {
  EngineRuntime,
  type RuntimePlayerState,
  type RuntimeSphereState,
} from "./engineRuntime";
import { MOVEMENT_CONFIG } from "./config";
import type { MoveInput } from "./input";
import type { RemotePlayerRenderState } from "../scene/sceneRenderer";
import type { SceneState } from "../scene/sceneRenderer";

function toRuntimePlayerState({
  x,
  y,
  z,
  yaw,
}: {
  x: number;
  y: number;
  z: number;
  yaw: number;
}): RuntimePlayerState {
  return { x, y, z, yaw };
}

export class Simulation {
  private renderSpheres: RuntimeSphereState[] = [];

  private constructor(
    private readonly scene: SceneState,
    private readonly runtime: EngineRuntime,
  ) {}

  static async create(scene: SceneState): Promise<Simulation> {
    const runtime = await EngineRuntime.create({
      ballRadius: scene.ballRadius,
      moveSpeed: MOVEMENT_CONFIG.moveSpeed,
      orbitSpeed: MOVEMENT_CONFIG.orbitSpeed,
      jumpVelocity: MOVEMENT_CONFIG.jumpVelocity,
      gravity: MOVEMENT_CONFIG.gravity,
      playerStartX: scene.player.x,
      playerStartY: scene.player.y,
      playerStartZ: scene.player.z,
      playerStartYaw: scene.player.yaw,
    });

    const simulation = new Simulation(scene, runtime);
    simulation.syncPlayerPosition();
    return simulation;
  }

  dispose(): void {
    this.runtime.dispose();
  }

  resetVerticalVelocity(): void {
    this.runtime.syncLocal(toRuntimePlayerState(this.scene.player), true);
  }

  syncPlayerPosition(): void {
    this.runtime.syncLocal(toRuntimePlayerState(this.scene.player), false);
  }

  getRenderSpheres(): RuntimeSphereState[] {
    return this.renderSpheres;
  }

  step(
    input: MoveInput,
    dt: number,
    remotePlayers: readonly RemotePlayerRenderState[],
  ): void {
    this.runtime.setInput({
      horizontal: input.horizontal,
      vertical: input.vertical,
      orbitDelta: input.orbitDelta,
      jumpPressed: input.jumpPressed,
    });

    this.runtime.setRemotePlayers(remotePlayers);

    const { player, spheres } = this.runtime.step(dt);
    this.scene.player.x = player.x;
    this.scene.player.y = player.y;
    this.scene.player.z = player.z;
    this.scene.player.yaw = player.yaw;
    this.renderSpheres = spheres;
  }
}
