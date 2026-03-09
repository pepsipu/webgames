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

    scene.cameraYaw +=
      input.orbitDelta + orbitInput * MOVEMENT_CONFIG.orbitSpeed * dt;
    if (Math.abs(scene.cameraYaw) > Math.PI * 2) {
      scene.cameraYaw %= Math.PI * 2;
    }

    const moveStep = forwardInput * MOVEMENT_CONFIG.moveSpeed * dt;
    scene.ballX += -Math.sin(scene.cameraYaw) * moveStep;
    scene.ballZ += -Math.cos(scene.cameraYaw) * moveStep;

    if (input.jumpPressed && scene.ballY <= 1e-6) {
      ballVelocityY = MOVEMENT_CONFIG.jumpVelocity;
    }

    ballVelocityY += MOVEMENT_CONFIG.gravity * dt;
    scene.ballY += ballVelocityY * dt;

    if (scene.ballY < 0) {
      scene.ballY = 0;
      ballVelocityY = 0;
    }
  }

  return {
    resetVerticalVelocity,
    step,
  };
}
