import './style.css'
import { createChatController } from './chat/chatController'
import { createInputController } from './controls/inputController'
import { createPositionSync } from './network/positionSync'
import { createRealtimeClient } from './network/realtimeClient'
import { createRemotePlayersOverlay } from './players/remotePlayersOverlay'
import { projectWorldToCanvas } from './scene/camera'
import { updateMovement } from './scene/movement'
import { createSceneRenderer } from './scene/sceneRenderer'
import { createSceneUi } from './ui/sceneUi'

const app = document.querySelector('#app')

const CONTROL_CONFIG = Object.freeze({
  stickRadiusPx: 72,
  stickDeadZone: 0.16,
  dragOrbitSensitivity: 0.006,
})

const MOVEMENT_TUNING = Object.freeze({
  moveSpeed: 18,
  orbitSpeed: 2.2,
  jumpVelocity: 12,
  gravity: -32,
  minX: -120,
  maxX: 120,
  minZ: -120,
  maxZ: 120,
})

const NETWORK_SYNC_CONFIG = Object.freeze({
  minSendInterval: 0.08,
  forcedSendInterval: 0.25,
  positionThreshold: 0.02,
  heightThreshold: 0.02,
  yawThreshold: 0.02,
})

const NETWORK_STATUS_LABELS = Object.freeze({
  connecting: 'Connecting...',
  connected: 'Online',
  disconnected: 'Reconnecting...',
})

const CHAT_BUBBLE_HEIGHT_FACTOR = 2.22

function showError(message) {
  app.innerHTML = `<p class="error">${message}</p>`
}

function getViewportSize() {
  if (window.visualViewport) {
    return {
      width: Math.max(1, window.visualViewport.width),
      height: Math.max(1, window.visualViewport.height),
    }
  }

  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  }
}

function createInitialScene() {
  return {
    ballRadius: 0.42,
    ballX: 0,
    ballZ: 2,
    ballY: 0,
    ballVelocityY: 0,
    ballOrientation: new Float32Array([0, 0, 0, 1]),
    cameraYaw: 0,
  }
}

function assignFinite(target, key, value) {
  if (Number.isFinite(value)) {
    target[key] = value
  }
}

function applyNetworkStatus(statusElement, status) {
  statusElement.classList.remove('connecting', 'connected', 'disconnected')
  statusElement.classList.add(status)
  statusElement.textContent = NETWORK_STATUS_LABELS[status] ?? NETWORK_STATUS_LABELS.connecting
}

async function init() {
  if (!navigator.gpu) {
    showError('WebGPU is not available in this browser.')
    return
  }

  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    showError('No suitable GPU adapter was found.')
    return
  }

  const device = await adapter.requestDevice()
  const {
    canvas,
    stickBase,
    stickKnob,
    chatBubble,
    chatForm,
    chatInput,
    remoteLayer,
    networkStatus,
  } = createSceneUi(app)

  const scene = createInitialScene()
  const format = navigator.gpu.getPreferredCanvasFormat()
  const renderer = createSceneRenderer({ device, canvas, format, scene })

  const input = createInputController({
    canvas,
    stickBase,
    stickKnob,
    stickRadiusPx: CONTROL_CONFIG.stickRadiusPx,
    stickDeadZone: CONTROL_CONFIG.stickDeadZone,
    dragOrbitSensitivity: CONTROL_CONFIG.dragOrbitSensitivity,
  })

  let localPlayerId = null
  let realtimeClient = null

  const remotePlayers = createRemotePlayersOverlay({
    layerElement: remoteLayer,
    projectPlayer: (player) => projectWorldToCanvas(
      [
        player.x,
        (Number.isFinite(player.y) ? player.y : 0) + scene.ballRadius * CHAT_BUBBLE_HEIGHT_FACTOR,
        player.z,
      ],
      scene,
      canvas,
    ),
  })

  const chat = createChatController({
    chatBubble,
    chatForm,
    chatInput,
    projectBubble: () => projectWorldToCanvas(
      [scene.ballX, scene.ballY + scene.ballRadius * CHAT_BUBBLE_HEIGHT_FACTOR, scene.ballZ],
      scene,
      canvas,
    ),
    onSubmit: (text) => {
      realtimeClient?.sendChat(text)
    },
  })

  const positionSync = createPositionSync(scene, NETWORK_SYNC_CONFIG)

  function updateFrame(dt) {
    updateMovement(scene, MOVEMENT_TUNING, input.getMoveInput(), dt)

    positionSync.update(
      dt,
      scene,
      (payload) => realtimeClient?.sendPosition(payload) ?? false,
    )

    renderer.render(remotePlayers.listPlayers())
    chat.update()
    remotePlayers.update()
  }

  realtimeClient = createRealtimeClient({
    onStatusChange: (status) => {
      applyNetworkStatus(networkStatus, status)
      if (status === 'connected') {
        positionSync.forceSend()
      }
    },
    onWelcome: (message) => {
      localPlayerId = typeof message.selfPlayerId === 'string'
        ? message.selfPlayerId
        : null

      if (Array.isArray(message.players)) {
        remotePlayers.replaceAll(message.players, localPlayerId)

        const localPlayer = message.players.find((player) => player.id === localPlayerId)
        if (localPlayer) {
          assignFinite(scene, 'ballX', localPlayer.x)
          assignFinite(scene, 'ballY', localPlayer.y)
          assignFinite(scene, 'ballZ', localPlayer.z)
          assignFinite(scene, 'cameraYaw', localPlayer.yaw)
          scene.ballVelocityY = 0
          positionSync.resetBaseline(scene)
        }
      }

      positionSync.forceSend()
    },
    onPlayerJoin: (player) => {
      remotePlayers.upsertPlayer(player, localPlayerId)
    },
    onPlayerUpdate: (player) => {
      remotePlayers.upsertPlayer(player, localPlayerId)
    },
    onPlayerLeave: (playerId) => {
      remotePlayers.removePlayer(playerId)
    },
    onChat: (message) => {
      if (message.fromPlayerId === localPlayerId) {
        chat.setMessage(message.text)
        return
      }

      remotePlayers.setMessage(message.fromPlayerId, message.text)
    },
  })

  const updateLayout = () => {
    const { width, height } = getViewportSize()
    renderer.resize(width, height)
    chat.update()
    remotePlayers.update()
  }

  let lastTime = performance.now()
  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05)
    lastTime = now
    updateFrame(dt)
    requestAnimationFrame(frame)
  }

  window.addEventListener('resize', updateLayout, { passive: true })
  window.addEventListener('orientationchange', updateLayout, { passive: true })
  window.visualViewport?.addEventListener('resize', updateLayout, { passive: true })
  window.addEventListener('beforeunload', () => {
    realtimeClient?.close()
  })

  updateLayout()
  updateFrame(0)
  requestAnimationFrame(frame)
}

init().catch((error) => {
  showError('Failed to initialize WebGPU. Check the console for details.')
  console.error(error)
})
