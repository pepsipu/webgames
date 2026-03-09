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

    this.scene.player.yaw +=
      input.orbitDelta + orbitInput * MOVEMENT_CONFIG.orbitSpeed * dt;
    if (Math.abs(this.scene.player.yaw) > Math.PI * 2) {
      this.scene.player.yaw %= Math.PI * 2;
    }

    const moveStep = forwardInput * MOVEMENT_CONFIG.moveSpeed * dt;
    this.scene.player.x += -Math.sin(this.scene.player.yaw) * moveStep;
    this.scene.player.z += -Math.cos(this.scene.player.yaw) * moveStep;

    if (input.jumpPressed && this.scene.player.y <= 1e-6) {
      this.ballVelocityY = MOVEMENT_CONFIG.jumpVelocity;
    }

    this.ballVelocityY += MOVEMENT_CONFIG.gravity * dt;
    this.scene.player.y += this.ballVelocityY * dt;

    if (this.scene.player.y < 0) {
      this.scene.player.y = 0;
      this.ballVelocityY = 0;
    }
  }
}
