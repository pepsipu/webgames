import { normalizeYaw } from "@webgame/shared";
import { MOVEMENT_CONFIG } from "./config";
import type { MoveInput } from "./input";
import type {
  RemotePlayerRenderState,
  SceneState,
} from "../scene/sceneRenderer";
import { CollisionPhysics } from "./physics/collisionPhysics";
import type { PhysicsBallState } from "./physics/types";

function toPhysicsBallState({
  x,
  y,
  z,
}: {
  x: number;
  y: number;
  z: number;
}): PhysicsBallState {
  return { x, y, z };
}

export class Simulation {
  private ballVelocityY = 0;
  private readonly collisionPhysics: CollisionPhysics;

  constructor(private readonly scene: SceneState) {
    this.collisionPhysics = new CollisionPhysics(scene.ballRadius);
    this.collisionPhysics.syncLocal(toPhysicsBallState(scene.player));
  }

  dispose(): void {
    this.collisionPhysics.dispose();
  }

  resetVerticalVelocity(): void {
    this.ballVelocityY = 0;
  }

  syncPlayerPosition(): void {
    this.collisionPhysics.syncLocal(toPhysicsBallState(this.scene.player));
  }

  step(
    input: MoveInput,
    dt: number,
    remotePlayers: readonly RemotePlayerRenderState[],
  ): void {
    const resolved = this.collisionPhysics.consumeResolvedLocal();
    if (resolved) {
      this.scene.player.x = resolved.x;
      this.scene.player.y = resolved.y;
      this.scene.player.z = resolved.z;
    }

    const forwardInput = -input.vertical;
    const orbitInput = input.horizontal;
    const player = this.scene.player;
    const startPosition = toPhysicsBallState(player);

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

    this.collisionPhysics.step({
      dt,
      current: startPosition,
      target: toPhysicsBallState(player),
      remotes: remotePlayers.map(toPhysicsBallState),
    });
  }
}
