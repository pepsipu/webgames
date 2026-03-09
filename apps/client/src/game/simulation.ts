import { normalizeYaw } from "@webgame/shared";
import { MOVEMENT_CONFIG } from "./config";
import type { MoveInput } from "./input";
import type { SceneState } from "../scene/sceneRenderer";

export class Simulation {
  private ballVelocityY = 0;

  constructor(private readonly scene: SceneState) {}

  resetVerticalVelocity(): void {
    this.ballVelocityY = 0;
  }

  step(input: MoveInput, dt: number): void {
    const forwardInput = -input.vertical;
    const orbitInput = input.horizontal;
    const player = this.scene.player;

    player.yaw = normalizeYaw(
      player.yaw +
        input.orbitDelta +
        orbitInput * MOVEMENT_CONFIG.orbitSpeed * dt,
    );

    const moveStep = forwardInput * MOVEMENT_CONFIG.moveSpeed * dt;
    player.x += -Math.sin(player.yaw) * moveStep;
    player.z += -Math.cos(player.yaw) * moveStep;

    if (input.jumpPressed && player.y <= 1e-6) {
      this.ballVelocityY = MOVEMENT_CONFIG.jumpVelocity;
    }

    this.ballVelocityY += MOVEMENT_CONFIG.gravity * dt;
    player.y += this.ballVelocityY * dt;

    if (player.y < 0) {
      player.y = 0;
      this.ballVelocityY = 0;
    }
  }
}
