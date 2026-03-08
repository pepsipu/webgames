import type { PositionPayload } from "@webgame/shared";

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface ProjectedPoint {
  x: number;
  y: number;
}

export interface SceneState {
  ballRadius: number;
  ballX: number;
  ballZ: number;
  ballY: number;
  ballVelocityY: number;
  ballOrientation: Float32Array;
  cameraYaw: number;
}

export interface MovementTuning {
  moveSpeed: number;
  orbitSpeed: number;
  jumpVelocity: number;
  gravity: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MoveInput {
  horizontal: number;
  vertical: number;
  orbitDelta: number;
  jumpPressed: boolean;
}

export interface PositionSyncConfig {
  minSendInterval: number;
  forcedSendInterval: number;
  positionThreshold: number;
  heightThreshold: number;
  yawThreshold: number;
}

export interface RemotePlayerRenderState {
  id: string;
  x: number;
  y: number;
  z: number;
}

export type NetworkStatus = "connecting" | "connected" | "disconnected";

export interface RealtimeClient {
  close: () => void;
  sendChat: (text: string) => boolean;
  sendPosition: (position: PositionPayload) => boolean;
}

export type {
  ChatMessage,
  ClientChatMessage,
  ClientMessage,
  ClientPositionMessage,
  PlayerJoinMessage,
  PlayerLeaveMessage,
  PlayerState,
  PlayerUpdateMessage,
  PositionPayload,
  ServerMessage,
  WelcomeMessage,
} from "@webgame/shared";
