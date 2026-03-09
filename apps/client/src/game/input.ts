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

export class InputController {
  private pointerId: number | null = null;
  private anchorX = 0;
  private anchorY = 0;
  private startedAt = 0;
  private lastX = 0;
  private stickY = 0;
  private orbitDelta = 0;
  private pendingJump = false;
  private heldJump = false;
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
      vertical: clamp(this.stickY + keyboard.y, -1, 1),
      orbitDelta: this.orbitDelta,
      jumpPressed: this.heldJump || this.pendingJump,
    };

    this.orbitDelta = 0;
    this.pendingJump = false;
    return input;
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

  private resetPointer(): void {
    this.pointerId = null;
    this.startedAt = 0;
    this.lastX = 0;
    this.stickY = 0;
  }

  private updateStickFromPointer(clientX: number, clientY: number): void {
    const dx = clientX - this.anchorX;
    const dy = clientY - this.anchorY;
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

    this.stickY = normalizedY;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary || this.pointerId !== null) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.pointerId = event.pointerId;
    this.anchorX = event.clientX;
    this.anchorY = event.clientY;
    this.startedAt = performance.now();
    this.lastX = event.clientX;
    this.stickY = 0;

    this.options.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.lastX;
    this.lastX = event.clientX;
    this.orbitDelta -= deltaX * CONTROL_CONFIG.dragOrbitSensitivity;
    this.updateStickFromPointer(event.clientX, event.clientY);
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }

    const tapDuration = performance.now() - this.startedAt;
    const tapDistance = Math.hypot(
      event.clientX - this.anchorX,
      event.clientY - this.anchorY,
    );

    if (
      tapDuration <= TAP_MAX_DURATION_MS &&
      tapDistance <= TAP_MAX_DISTANCE_PX
    ) {
      this.pendingJump = true;
    }

    if (this.options.canvas.hasPointerCapture(event.pointerId)) {
      this.options.canvas.releasePointerCapture(event.pointerId);
    }

    this.resetPointer();
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
    this.resetPointer();
  };
}
