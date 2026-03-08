export const MESSAGE_TYPE = Object.freeze({
  WELCOME: "welcome",
  POSITION: "position",
  CHAT: "chat",
  PLAYER_JOIN: "player:join",
  PLAYER_UPDATE: "player:update",
  PLAYER_LEAVE: "player:leave",
} as const);

export interface PositionPayload {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface ClientPositionMessage extends PositionPayload {
  type: typeof MESSAGE_TYPE.POSITION;
}

export interface ClientChatMessage {
  type: typeof MESSAGE_TYPE.CHAT;
  text: string;
}

export type ClientMessage = ClientPositionMessage | ClientChatMessage;

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface WelcomeMessage {
  type: typeof MESSAGE_TYPE.WELCOME;
  selfPlayerId: string;
  players: PlayerState[];
}

export interface PlayerJoinMessage {
  type: typeof MESSAGE_TYPE.PLAYER_JOIN;
  player: PlayerState;
}

export interface PlayerUpdateMessage {
  type: typeof MESSAGE_TYPE.PLAYER_UPDATE;
  player: PlayerState;
}

export interface PlayerLeaveMessage {
  type: typeof MESSAGE_TYPE.PLAYER_LEAVE;
  playerId: string;
}

export interface ChatMessage {
  type: typeof MESSAGE_TYPE.CHAT;
  fromPlayerId: string;
  text: string;
  createdAt: number;
}

export type ServerMessage =
  | WelcomeMessage
  | PlayerJoinMessage
  | PlayerUpdateMessage
  | PlayerLeaveMessage
  | ChatMessage;
