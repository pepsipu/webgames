import type { Vector3 } from "@webgame/game";

export function parseNumber(value: any): number {
  const parsed = parseFloat(String(value));
  return parsed;
}

export function parseVector3(value: any): Vector3 {
  const parts = String(value)
    .trim()
    .split(" ")
    .map((part) => parseFloat(part.trim()));
  if (parts.length !== 3) {
    throw new Error(
      `Invalid Vector3 length: expected length=3, got length=${parts.length}: value="${value}"`,
    );
  }
  return [parts[0], parts[1], parts[2]];
}
