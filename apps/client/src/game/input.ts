import { CONTROL_CONFIG } from "./config";

const MOVEMENT_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

const JUMP_KEY = "Space";
const TAP_MAX_DURATION_MS = 240;
const TAP_MAX_DISTANCE_PX = 18;

export interface MoveInput {
  horizontal: number;
  vertical: number;
  orbitDelta: number;
  jumpPressed: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveAxis(negative: boolean, positive: boolean): number {
  return (negative ? 1 : 0) - (positive ? 1 : 0);
}

function normalizeInput(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (length <= 1) {
    return { x, y };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

export function createInputController({
  canvas,
  chatInput,
}: {
  canvas: HTMLCanvasElement;
  chatInput: HTMLInputElement;
}): { read: () => MoveInput } {
  const state = {
    pointerId: null as number | null,
    anchorX: 0,
    anchorY: 0,
    startedAt: 0,
    lastX: 0,
    stickY: 0,
    orbitDelta: 0,
    pendingJump: false,
    heldJump: false,
    pressedKeys: new Set<string>(),
  };

  function resetPointer(): void {
    state.pointerId = null;
    state.startedAt = 0;
    state.lastX = 0;
    state.stickY = 0;
  }

  function updateStickFromPointer(clientX: number, clientY: number): void {
    const dx = clientX - state.anchorX;
    const dy = clientY - state.anchorY;

    const distance = Math.hypot(dx, dy);
    const scale = distance > CONTROL_CONFIG.stickRadiusPx
      ? CONTROL_CONFIG.stickRadiusPx / distance
      : 1;

    const clampedX = dx * scale;
    const clampedY = dy * scale;
    let normalizedY = clampedY / CONTROL_CONFIG.stickRadiusPx;

    const magnitude = Math.hypot(clampedX, clampedY) / CONTROL_CONFIG.stickRadiusPx;
    if (magnitude < CONTROL_CONFIG.stickDeadZone) {
      normalizedY = 0;
    } else if (magnitude > 0) {
      const adjustedMagnitude =
        (magnitude - CONTROL_CONFIG.stickDeadZone) /
        (1 - CONTROL_CONFIG.stickDeadZone);
      normalizedY = (normalizedY / magnitude) * adjustedMagnitude;
    }

    state.stickY = normalizedY;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || state.pointerId !== null) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    state.pointerId = event.pointerId;
    state.anchorX = event.clientX;
    state.anchorY = event.clientY;
    state.startedAt = performance.now();
    state.lastX = event.clientX;
    state.stickY = 0;

    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== state.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.lastX;
    state.lastX = event.clientX;
    state.orbitDelta -= deltaX * CONTROL_CONFIG.dragOrbitSensitivity;

    updateStickFromPointer(event.clientX, event.clientY);
  });

  const handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== state.pointerId) {
      return;
    }

    const tapDuration = performance.now() - state.startedAt;
    const tapDistance = Math.hypot(
      event.clientX - state.anchorX,
      event.clientY - state.anchorY,
    );

    if (tapDuration <= TAP_MAX_DURATION_MS && tapDistance <= TAP_MAX_DISTANCE_PX) {
      state.pendingJump = true;
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    resetPointer();
  };

  canvas.addEventListener("pointerup", handlePointerEnd);
  canvas.addEventListener("pointercancel", handlePointerEnd);

  window.addEventListener("keydown", (event) => {
    if (
      event.code === "Slash" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.isComposing &&
      !isTypingTarget(event.target)
    ) {
      event.preventDefault();
      chatInput.focus();
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.code === JUMP_KEY) {
      state.heldJump = true;
      event.preventDefault();
      return;
    }

    if (!MOVEMENT_KEYS.has(event.code)) {
      return;
    }

    state.pressedKeys.add(event.code);
    event.preventDefault();
  }, { passive: false });

  window.addEventListener("keyup", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.code === JUMP_KEY) {
      state.heldJump = false;
      return;
    }

    state.pressedKeys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    state.pressedKeys.clear();
    state.heldJump = false;
    state.pendingJump = false;
    resetPointer();
  });

  function read(): MoveInput {
    const keyboard = normalizeInput(
      resolveAxis(
        state.pressedKeys.has("KeyA") || state.pressedKeys.has("ArrowLeft"),
        state.pressedKeys.has("KeyD") || state.pressedKeys.has("ArrowRight"),
      ),
      resolveAxis(
        state.pressedKeys.has("KeyS") || state.pressedKeys.has("ArrowDown"),
        state.pressedKeys.has("KeyW") || state.pressedKeys.has("ArrowUp"),
      ),
    );

    const input: MoveInput = {
      horizontal: keyboard.x,
      vertical: clamp(state.stickY + keyboard.y, -1, 1),
      orbitDelta: state.orbitDelta,
      jumpPressed: state.heldJump || state.pendingJump,
    };

    state.orbitDelta = 0;
    state.pendingJump = false;
    return input;
  }

  return { read };
}
