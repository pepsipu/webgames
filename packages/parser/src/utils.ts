import type { Vector3 } from "@webgame/engine";

export function parseOptionalNumber(value: string | boolean | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return parsed;
}

export function parseOptionalVector3(value: string | boolean | undefined): Vector3 | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseVector3(String(value));
}

export function parseVector3(value: string): Vector3 {
  const parts = value.trim().split(/\s+/).map(part => parseFloat(part.trim()));
  if (parts.length !== 3) {
    throw new Error(`Invalid Vector3 length: expected length=3, got length=${parts.length}: value="${value}"`);
  }
  return [parts[0], parts[1], parts[2]];
}
