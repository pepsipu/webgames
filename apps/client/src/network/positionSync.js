const DEFAULT_SYNC_CONFIG = Object.freeze({
  minSendInterval: 0.08,
  forcedSendInterval: 0.25,
  positionThreshold: 0.02,
  yawThreshold: 0.02,
})

function shortestAngleDistance(a, b) {
  const fullCycle = Math.PI * 2
  let delta = (a - b) % fullCycle

  if (delta > Math.PI) {
    delta -= fullCycle
  }

  if (delta < -Math.PI) {
    delta += fullCycle
  }

  return delta
}

export function createPositionSync(initialScene, config = DEFAULT_SYNC_CONFIG) {
  const state = {
    elapsedSinceSend: 0,
    forceNextSend: true,
    lastSentX: initialScene.ballX,
    lastSentZ: initialScene.ballZ,
    lastSentYaw: initialScene.cameraYaw,
  }

  function resetBaseline(scene) {
    state.elapsedSinceSend = 0
    state.lastSentX = scene.ballX
    state.lastSentZ = scene.ballZ
    state.lastSentYaw = scene.cameraYaw
  }

  function forceSend() {
    state.forceNextSend = true
  }

  function update(dt, scene, sendPosition) {
    state.elapsedSinceSend += dt

    if (state.elapsedSinceSend < config.minSendInterval) {
      return
    }

    const movedDistance = Math.hypot(
      scene.ballX - state.lastSentX,
      scene.ballZ - state.lastSentZ,
    )

    const rotatedAmount = Math.abs(
      shortestAngleDistance(scene.cameraYaw, state.lastSentYaw),
    )

    const hasMoved =
      movedDistance >= config.positionThreshold ||
      rotatedAmount >= config.yawThreshold

    const forcedByTimeout = state.elapsedSinceSend >= config.forcedSendInterval
    if (!state.forceNextSend && !hasMoved && !forcedByTimeout) {
      return
    }

    const sent = sendPosition({ x: scene.ballX, z: scene.ballZ, yaw: scene.cameraYaw })
    if (!sent) {
      return
    }

    resetBaseline(scene)
    state.forceNextSend = false
  }

  return {
    forceSend,
    resetBaseline,
    update,
  }
}
