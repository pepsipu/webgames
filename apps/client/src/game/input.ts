import { clamp } from "@webgame/shared";
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

interface InputControllerOptions {
  canvas: HTMLCanvasElement;
  chatInput: HTMLInputElement;
}

function resolveAxis(negative: boolean, positive: boolean): number {
  return (negative ? 1 : 0) - (positive ? 1 : 0);
}

function normalizeInput(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  return length <= 1 ? { x, y } : { x: x / length, y: y / length };
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

interface PointerState {
  id: number;
  anchorX: number;
  anchorY: number;
  startedAt: number;
  lastX: number;
  stickY: number;
}

export class InputController {
  private primaryPointer: PointerState | null = null;
  private secondaryPointer: PointerState | null = null;
  private readonly pressedKeys = new Set<string>();

  constructor(private readonly options: InputControllerOptions) {
    this.attachListeners();
  }

  read(): MoveInput {
    const keyboard = normalizeInput(
      resolveAxis(
        this.pressedKeys.has("KeyA") || this.pressedKeys.has("ArrowLeft"),
        this.pressedKeys.has("KeyD") || this.pressedKeys.has("ArrowRight"),
      ),
      resolveAxis(
        this.pressedKeys.has("KeyS") || this.pressedKeys.has("ArrowDown"),
        this.pressedKeys.has("KeyW") || this.pressedKeys.has("ArrowUp"),
      ),
    );

    const input: MoveInput = {
      horizontal: keyboard.x,
      vertical: clamp(this.getStickY() + keyboard.y, -1, 1),
      orbitDelta: this.getOrbitDelta(),
      jumpPressed: this.heldJump || this.pendingJump,
    };

    // Reset per-frame state
    this.pendingJump = false;
    if (this.primaryPointer) {
      this.primaryPointer.stickY = 0;
    }
    return input;
  }

  private orbitDelta = 0;
  private pendingJump = false;
  private heldJump = false;

  private getStickY(): number {
    return this.primaryPointer?.stickY ?? 0;
  }

  private getOrbitDelta(): number {
    const delta = this.orbitDelta;
    this.orbitDelta = 0;
    return delta;
  }

  private attachListeners(): void {
    this.options.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.options.canvas.addEventListener("pointermove", this.onPointerMove);
    this.options.canvas.addEventListener("pointerup", this.onPointerEnd);
    this.options.canvas.addEventListener("pointercancel", this.onPointerEnd);

    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  private createPointerState(event: PointerEvent): PointerState {
    return {
      id: event.pointerId,
      anchorX: event.clientX,
      anchorY: event.clientY,
      startedAt: performance.now(),
      lastX: event.clientX,
      stickY: 0,
    };
  }

  private updateStickFromPointer(state: PointerState, clientX: number, clientY: number): void {
    const dx = clientX - state.anchorX;
    const dy = clientY - state.anchorY;
    const distance = Math.hypot(dx, dy);
    const scale =
      distance > CONTROL_CONFIG.stickRadiusPx
        ? CONTROL_CONFIG.stickRadiusPx / distance
        : 1;

    const clampedX = dx * scale;
    const clampedY = dy * scale;
    let normalizedY = clampedY / CONTROL_CONFIG.stickRadiusPx;
    const magnitude =
      Math.hypot(clampedX, clampedY) / CONTROL_CONFIG.stickRadiusPx;

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

  private handleTap(state: PointerState, clientX: number, clientY: number): void {
    const tapDuration = performance.now() - state.startedAt;
    const tapDistance = Math.hypot(
      clientX - state.anchorX,
      clientY - state.anchorY,
    );

    if (
      tapDuration <= TAP_MAX_DURATION_MS &&
      tapDistance <= TAP_MAX_DISTANCE_PX
    ) {
      // Any pointer tap triggers jump
      this.pendingJump = true;
    }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();

    // Allocate to primary or secondary slot
    if (!this.primaryPointer) {
      this.primaryPointer = this.createPointerState(event);
      this.options.canvas.setPointerCapture(event.pointerId);
    } else if (!this.secondaryPointer) {
      this.secondaryPointer = this.createPointerState(event);
      this.options.canvas.setPointerCapture(event.pointerId);
    }
    // Ignore additional pointers beyond two
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    let state: PointerState | null = null;
    if (this.primaryPointer?.id === event.pointerId) {
      state = this.primaryPointer;
    } else if (this.secondaryPointer?.id === event.pointerId) {
      state = this.secondaryPointer;
    }

    if (!state) return;

    const deltaX = event.clientX - state.lastX;
    state.lastX = event.clientX;

    // Only primary pointer controls orbit
    if (state === this.primaryPointer) {
      this.orbitDelta -= deltaX * CONTROL_CONFIG.dragOrbitSensitivity;
      this.updateStickFromPointer(state, event.clientX, event.clientY);
    }
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    let state: PointerState | null = null;
    let isPrimary = false;

    if (this.primaryPointer?.id === event.pointerId) {
      state = this.primaryPointer;
      isPrimary = true;
    } else if (this.secondaryPointer?.id === event.pointerId) {
      state = this.secondaryPointer;
    }

    if (!state) return;

    this.handleTap(state, event.clientX, event.clientY);

    if (this.options.canvas.hasPointerCapture(event.pointerId)) {
      this.options.canvas.releasePointerCapture(event.pointerId);
    }

    if (isPrimary) {
      this.primaryPointer = this.secondaryPointer;
      this.secondaryPointer = null;
    } else {
      this.secondaryPointer = null;
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (
      event.code === "Slash" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.isComposing &&
      !isTypingTarget(event.target)
    ) {
      event.preventDefault();
      this.options.chatInput.focus();
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.code === JUMP_KEY) {
      this.heldJump = true;
      event.preventDefault();
      return;
    }

    if (!MOVEMENT_KEYS.has(event.code)) {
      return;
    }

    this.pressedKeys.add(event.code);
    event.preventDefault();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.code === JUMP_KEY) {
      this.heldJump = false;
      return;
    }

    this.pressedKeys.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.pressedKeys.clear();
    this.heldJump = false;
    this.pendingJump = false;
    this.primaryPointer = null;
    this.secondaryPointer = null;
  };
}