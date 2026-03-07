import { clamp, normalizeInput } from '../utils/math'

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
    lastX: 0,
    x: 0,
    y: 0,
  }

  const pressedKeys = new Set()
  let orbitDelta = 0

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
    stick.lastX = 0
    stick.x = 0
    stick.y = 0
    setStickVisible(false)
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
      const normalizedMagnitude = (magnitude - stickDeadZone) / (1 - stickDeadZone)
      normalizedX = (normalizedX / magnitude) * normalizedMagnitude
      normalizedY = (normalizedY / magnitude) * normalizedMagnitude
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
    stick.lastX = event.clientX
    stick.x = 0
    stick.y = 0

    setStickVisible(true)
    updateStickVisual(0, 0)
    canvas.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event) {
    if (event.pointerId !== stick.pointerId) {
      return
    }

    const dx = event.clientX - stick.lastX
    stick.lastX = event.clientX

    orbitDelta -= dx * dragOrbitSensitivity
    updateStickFromPointer(event.clientX, event.clientY)
  }

  function handlePointerUp(event) {
    if (event.pointerId !== stick.pointerId) {
      return
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    resetStick()
  }

  function handleKeyDown(event) {
    const code = event.code
    if (
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      pressedKeys.add(code)
      event.preventDefault()
    }
  }

  function handleKeyUp(event) {
    pressedKeys.delete(event.code)
  }

  function handleBlur() {
    pressedKeys.clear()
    resetStick()
  }

  function getKeyboardInput() {
    const left = pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')
    const right = pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')
    const up = pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')
    const down = pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')

    const x = (left ? 1 : 0) - (right ? 1 : 0)
    const y = (down ? 1 : 0) - (up ? 1 : 0)

    return normalizeInput(x, y)
  }

  function getMoveInput() {
    const keyboard = getKeyboardInput()
    const vertical = clamp(stick.y + keyboard.y, -1, 1)

    const output = {
      horizontal: keyboard.x,
      vertical,
      orbitDelta,
    }

    orbitDelta = 0
    return output
  }

  canvas.addEventListener('pointerdown', handlePointerDown)
  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerup', handlePointerUp)
  canvas.addEventListener('pointercancel', handlePointerUp)

  window.addEventListener('keydown', handleKeyDown, { passive: false })
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', handleBlur)

  return {
    getMoveInput,
    dispose() {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)

      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    },
  }
}
