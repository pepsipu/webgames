import { MOVEMENT_CONFIG } from "./config";
import type { MoveInput } from "./input";
import type { SceneState } from "../scene/sceneRenderer";

export function createSimulation(scene: SceneState): {
  resetVerticalVelocity: () => void;
  step: (input: MoveInput, dt: number) => void;
} {
  let ballVelocityY = 0;

  function resetVerticalVelocity(): void {
    ballVelocityY = 0;
  }

  function step(input: MoveInput, dt: number): void {
    const forwardInput = -input.vertical;
    const orbitInput = input.horizontal;

    scene.player.yaw +=
      input.orbitDelta + orbitInput * MOVEMENT_CONFIG.orbitSpeed * dt;
    if (Math.abs(scene.player.yaw) > Math.PI * 2) {
      scene.player.yaw %= Math.PI * 2;
    }

    const moveStep = forwardInput * MOVEMENT_CONFIG.moveSpeed * dt;
    scene.player.x += -Math.sin(scene.player.yaw) * moveStep;
    scene.player.z += -Math.cos(scene.player.yaw) * moveStep;

    if (input.jumpPressed && scene.player.y <= 1e-6) {
      ballVelocityY = MOVEMENT_CONFIG.jumpVelocity;
    }

    ballVelocityY += MOVEMENT_CONFIG.gravity * dt;
    scene.player.y += ballVelocityY * dt;

    if (scene.player.y < 0) {
      scene.player.y = 0;
      ballVelocityY = 0;
    }
  }

  return {
    resetVerticalVelocity,
    step,
  };
}
