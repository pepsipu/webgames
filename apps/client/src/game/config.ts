export type NetworkStatus = "connecting" | "connected" | "disconnected";

export const CHAT_LIMIT = 140;
export const CHAT_BUBBLE_HEIGHT_FACTOR = 2.22;

export const CONTROL_CONFIG = Object.freeze({
  stickRadiusPx: 72,
  stickDeadZone: 0.16,
  dragOrbitSensitivity: 0.006,
});

export const MOVEMENT_CONFIG = Object.freeze({
  moveSpeed: 18,
  orbitSpeed: 2.2,
  jumpVelocity: 12,
  gravity: -32,
});

export const NETWORK_STATUS_LABELS: Record<NetworkStatus, string> = Object.freeze({
  connecting: "Connecting...",
  connected: "Online",
  disconnected: "Reconnecting...",
});

export const NETWORK_CONFIG = Object.freeze({
  sendIntervalSeconds: 0.08,
  reconnectBaseDelayMs: 600,
  reconnectMaxDelayMs: 10_000,
});
