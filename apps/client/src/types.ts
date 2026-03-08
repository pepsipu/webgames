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

export interface PositionPayload {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface PositionSyncConfig {
  minSendInterval: number;
  forcedSendInterval: number;
  positionThreshold: number;
  heightThreshold: number;
  yawThreshold: number;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface RemotePlayerRenderState {
  id: string;
  x: number;
  y: number;
  z: number;
}

export type NetworkStatus = "connecting" | "connected" | "disconnected";

export interface WelcomeMessage {
  type: "welcome";
  selfPlayerId: string;
  players: PlayerState[];
}

export interface PlayerJoinMessage {
  type: "player:join";
  player: PlayerState;
}

export interface PlayerUpdateMessage {
  type: "player:update";
  player: PlayerState;
}

export interface PlayerLeaveMessage {
  type: "player:leave";
  playerId: string;
}

export interface ChatMessage {
  type: "chat";
  fromPlayerId: string;
  text: string;
  createdAt?: number;
}

export type ServerMessage =
  | WelcomeMessage
  | PlayerJoinMessage
  | PlayerUpdateMessage
  | PlayerLeaveMessage
  | ChatMessage;

export interface RealtimeClient {
  close: () => void;
  sendChat: (text: string) => boolean;
  sendPosition: (position: PositionPayload) => boolean;
}
