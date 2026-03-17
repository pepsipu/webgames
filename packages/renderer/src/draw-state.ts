import type { Material, TransformState } from "@webgame/engine";

export type DrawState = Float32Array<ArrayBuffer>;

export function createDrawState(): DrawState {
  return new Float32Array(
    new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT),
  );
}

export function setDrawState(
  output: DrawState,
  transform: TransformState,
  material: Material,
): void {
  const { position, rotation, scale } = transform;

  output[0] = position[0];
  output[1] = position[1];
  output[2] = position[2];
  output[3] = 0;
  output[4] = rotation[0];
  output[5] = rotation[1];
  output[6] = rotation[2];
  output[7] = rotation[3];
  output[8] = scale[0];
  output[9] = scale[1];
  output[10] = scale[2];
  output[11] = 0;
  output[12] = material.color[0];
  output[13] = material.color[1];
  output[14] = material.color[2];
  output[15] = 0;
}
