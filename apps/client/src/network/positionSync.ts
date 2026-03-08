import type { PositionPayload, PositionSyncConfig, SceneState } from "../types";

const DEFAULT_SYNC_CONFIG = Object.freeze({
  minSendInterval: 0.08,
  forcedSendInterval: 0.25,
  positionThreshold: 0.02,
  heightThreshold: 0.02,
  yawThreshold: 0.02,
});

function shortestAngleDistance(a: number, b: number): number {
  const fullCycle = Math.PI * 2;
  let delta = (a - b) % fullCycle;

  if (delta > Math.PI) {
    delta -= fullCycle;
  }

  if (delta < -Math.PI) {
    delta += fullCycle;
  }

  return delta;
}

export function createPositionSync(
  initialScene: SceneState,
  config: PositionSyncConfig = DEFAULT_SYNC_CONFIG,
): {
  forceSend: () => void;
  resetBaseline: (scene: SceneState) => void;
  update: (
    dt: number,
    scene: SceneState,
    sendPosition: (payload: PositionPayload) => boolean,
  ) => void;
} {
  const state = {
    elapsedSinceSend: 0,
    forceNextSend: true,
    lastSentX: initialScene.ballX,
    lastSentY: initialScene.ballY,
    lastSentZ: initialScene.ballZ,
    lastSentYaw: initialScene.cameraYaw,
  };

  function resetBaseline(scene: SceneState): void {
    state.elapsedSinceSend = 0;
    state.lastSentX = scene.ballX;
    state.lastSentY = scene.ballY;
    state.lastSentZ = scene.ballZ;
    state.lastSentYaw = scene.cameraYaw;
  }

  function forceSend() {
    state.forceNextSend = true;
  }

  function update(
    dt: number,
    scene: SceneState,
    sendPosition: (payload: PositionPayload) => boolean,
  ): void {
    state.elapsedSinceSend += dt;

    if (state.elapsedSinceSend < config.minSendInterval) {
      return;
    }

    const movedDistance = Math.hypot(
      scene.ballX - state.lastSentX,
      scene.ballZ - state.lastSentZ,
    );
    const movedHeight = Math.abs(scene.ballY - state.lastSentY);

    const rotatedAmount = Math.abs(
      shortestAngleDistance(scene.cameraYaw, state.lastSentYaw),
    );

    const hasMoved =
      movedDistance >= config.positionThreshold ||
      movedHeight >= config.heightThreshold ||
      rotatedAmount >= config.yawThreshold;

    const forcedByTimeout = state.elapsedSinceSend >= config.forcedSendInterval;
    if (!state.forceNextSend && !hasMoved && !forcedByTimeout) {
      return;
    }

    const sent = sendPosition({
      x: scene.ballX,
      y: scene.ballY,
      z: scene.ballZ,
      yaw: scene.cameraYaw,
    });
    if (!sent) {
      return;
    }

    resetBaseline(scene);
    state.forceNextSend = false;
  }

  return {
    forceSend,
    resetBaseline,
    update,
  };
}
