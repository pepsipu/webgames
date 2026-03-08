import {
  clamp,
  multiplyQuat,
  normalizeQuat,
  quatFromAxisAngle,
} from "../utils/math";
import type { MoveInput, MovementTuning, SceneState } from "../types";

export function updateMovement(
  scene: SceneState,
  tuning: MovementTuning,
  input: MoveInput,
  dt: number,
): void {
  const forwardInput = -input.vertical;
  const orbitInput = input.horizontal;

  scene.cameraYaw += input.orbitDelta + orbitInput * tuning.orbitSpeed * dt;
  if (Math.abs(scene.cameraYaw) > Math.PI * 2) {
    scene.cameraYaw %= Math.PI * 2;
  }

  const step = forwardInput * tuning.moveSpeed * dt;
  const forwardX = -Math.sin(scene.cameraYaw);
  const forwardZ = -Math.cos(scene.cameraYaw);

  const previousX = scene.ballX;
  const previousZ = scene.ballZ;

  scene.ballX = clamp(scene.ballX + forwardX * step, tuning.minX, tuning.maxX);
  scene.ballZ = clamp(scene.ballZ + forwardZ * step, tuning.minZ, tuning.maxZ);

  const movedX = scene.ballX - previousX;
  const movedZ = scene.ballZ - previousZ;
  const movedDistance = Math.hypot(movedX, movedZ);
  if (movedDistance > 1e-6) {
    // For rolling on a ground plane, axis = moveDirection x up.
    const axisX = movedZ / movedDistance;
    const axisZ = -movedX / movedDistance;
    const rotationAngle = movedDistance / scene.ballRadius;

    const delta = quatFromAxisAngle(axisX, 0, axisZ, rotationAngle);
    const combined = multiplyQuat(delta, scene.ballOrientation);
    scene.ballOrientation.set(normalizeQuat(combined));
  }

  if (input.jumpPressed && scene.ballY <= 1e-6) {
    scene.ballVelocityY = tuning.jumpVelocity;
  }

  scene.ballVelocityY += tuning.gravity * dt;
  scene.ballY += scene.ballVelocityY * dt;

  if (scene.ballY < 0) {
    scene.ballY = 0;
    scene.ballVelocityY = 0;
  }
}
