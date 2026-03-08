import { clamp, normalizeInput } from '../utils/math'
import { isTypingTarget } from '../utils/dom'

const MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])
const JUMP_KEY = 'Space'
const TAP_MAX_DURATION_MS = 240
const TAP_MAX_DISTANCE_PX = 18

function resolveAxis(negative, positive) {
  return (negative ? 1 : 0) - (positive ? 1 : 0)
}

export function createInputController({
  canvas,
  stickBase,
  stickKnob,
  stickRadiusPx,
  stickDeadZone,
  dragOrbitSensitivity,
}) {
  const stick = {
    pointerId: null,
    anchorX: 0,
    anchorY: 0,
    startedAt: 0,
    lastX: 0,
    x: 0,
    y: 0,
  }

  const pressedKeys = new Set()
  let orbitDelta = 0
  let pendingJump = false
  let heldJump = false

  function setStickVisible(visible) {
    stickBase.classList.toggle('active', visible)
    stickKnob.classList.toggle('active', visible)
  }

  function updateStickVisual(knobOffsetX = 0, knobOffsetY = 0) {
    stickBase.style.transform = `translate(${stick.anchorX - stickRadiusPx}px, ${stick.anchorY - stickRadiusPx}px)`
    stickKnob.style.transform = `translate(${stick.anchorX + knobOffsetX - 24}px, ${stick.anchorY + knobOffsetY - 24}px)`
  }

  function resetStick() {
    stick.pointerId = null
    stick.startedAt = 0
    stick.lastX = 0
    stick.x = 0
    stick.y = 0
    setStickVisible(false)
  }

  function queueJump() {
    pendingJump = true
  }

  function updateStickFromPointer(clientX, clientY) {
    const dx = clientX - stick.anchorX
    const dy = clientY - stick.anchorY

    const distance = Math.hypot(dx, dy)
    const scale = distance > stickRadiusPx ? stickRadiusPx / distance : 1

    const clampedX = dx * scale
    const clampedY = dy * scale

    let normalizedX = clampedX / stickRadiusPx
    let normalizedY = clampedY / stickRadiusPx

    const magnitude = Math.hypot(normalizedX, normalizedY)
    if (magnitude < stickDeadZone) {
      normalizedX = 0
      normalizedY = 0
    } else if (magnitude > 0) {
      const adjustedMagnitude = (magnitude - stickDeadZone) / (1 - stickDeadZone)
      normalizedX = (normalizedX / magnitude) * adjustedMagnitude
      normalizedY = (normalizedY / magnitude) * adjustedMagnitude
    }

    stick.x = normalizedX
    stick.y = normalizedY
    updateStickVisual(clampedX, clampedY)
  }

  function handlePointerDown(event) {
    if (!event.isPrimary || stick.pointerId !== null) {
      return
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    event.preventDefault()
    stick.pointerId = event.pointerId
    stick.anchorX = event.clientX
    stick.anchorY = event.clientY
    stick.startedAt = performance.now()
    stick.lastX = event.clientX
    stick.x = 0
    stick.y = 0

    setStickVisible(true)
    updateStickVisual()
    canvas.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event) {
    if (event.pointerId !== stick.pointerId) {
      return
    }

    const deltaX = event.clientX - stick.lastX
    stick.lastX = event.clientX

    orbitDelta -= deltaX * dragOrbitSensitivity
    updateStickFromPointer(event.clientX, event.clientY)
  }

  function handlePointerUp(event) {
    if (event.pointerId !== stick.pointerId) {
      return
    }

    const tapDuration = performance.now() - stick.startedAt
    const tapDistance = Math.hypot(
      event.clientX - stick.anchorX,
      event.clientY - stick.anchorY,
    )

    if (tapDuration <= TAP_MAX_DURATION_MS && tapDistance <= TAP_MAX_DISTANCE_PX) {
      queueJump()
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    resetStick()
  }

  function handleKeyDown(event) {
    if (isTypingTarget(event.target)) {
      return
    }

    if (event.code === JUMP_KEY) {
      heldJump = true
      event.preventDefault()
      return
    }

    if (!MOVEMENT_KEYS.has(event.code)) {
      return
    }

    pressedKeys.add(event.code)
    event.preventDefault()
  }

  function handleKeyUp(event) {
    if (isTypingTarget(event.target)) {
      return
    }

    if (event.code === JUMP_KEY) {
      heldJump = false
      return
    }

    pressedKeys.delete(event.code)
  }

  function getKeyboardInput() {
    const x = resolveAxis(
      pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft'),
      pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight'),
    )

    const y = resolveAxis(
      pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown'),
      pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp'),
    )

    return normalizeInput(x, y)
  }

  function getMoveInput() {
    const keyboard = getKeyboardInput()
    const nextInput = {
      horizontal: keyboard.x,
      vertical: clamp(stick.y + keyboard.y, -1, 1),
      orbitDelta,
      jumpPressed: heldJump || pendingJump,
    }

    orbitDelta = 0
    pendingJump = false
    return nextInput
  }

  canvas.addEventListener('pointerdown', handlePointerDown)
  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerup', handlePointerUp)
  canvas.addEventListener('pointercancel', handlePointerUp)

  window.addEventListener('keydown', handleKeyDown, { passive: false })
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', () => {
    pressedKeys.clear()
    heldJump = false
    pendingJump = false
    resetStick()
  })

  return { getMoveInput }
}
