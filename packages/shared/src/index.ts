export interface PositionPayload {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export const CHAT_LIMIT = 140;

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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeChatText(text: string): string {
  return text.trim().slice(0, CHAT_LIMIT);
}

export function sanitizeChatText(text: string): string | null {
  const nextText = normalizeChatText(text);
  return nextText.length > 0 ? nextText : null;
}

export type ServerMessage =
  | WelcomeMessage
  | PlayerEventMessage
  | PlayerLeaveMessage
  | ChatMessage;
