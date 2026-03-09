export interface PositionPayload {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface PlayerState extends PositionPayload {
  id: string;
}

export type ClientMessage =
  | ({ type: "position" } & PositionPayload)
  | { type: "chat"; text: string };

export interface WelcomeMessage {
  type: "welcome";
  selfPlayerId: string;
  players: PlayerState[];
}

export interface PlayerEventMessage {
  type: "player:join" | "player:update";
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
  createdAt: number;
}

export type ServerMessage =
  | WelcomeMessage
  | PlayerEventMessage
  | PlayerLeaveMessage
  | ChatMessage;
