import { crossVec3, dotVec3, normalizeVec3 } from "../utils/math";
import type { ProjectedPoint, SceneState, Vec3 } from "../types";

export const CAMERA_CONFIG = Object.freeze({
  fov: 1.05,
  orbitDistance: 5.2,
  orbitHeight: 1.75,
  lookAtYOffsetFactor: 0.25,
});

function getCameraPose(scene: SceneState): {
  position: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
} {
  const ballCenter: Vec3 = [
    scene.ballX,
    scene.ballRadius + scene.ballY,
    scene.ballZ,
  ];
  const orbitOffset: Vec3 = [
    Math.sin(scene.cameraYaw) * CAMERA_CONFIG.orbitDistance,
    CAMERA_CONFIG.orbitHeight,
    Math.cos(scene.cameraYaw) * CAMERA_CONFIG.orbitDistance,
  ];

  const position: Vec3 = [
    ballCenter[0] + orbitOffset[0],
    ballCenter[1] + orbitOffset[1],
    ballCenter[2] + orbitOffset[2],
  ];

  const forward = normalizeVec3([
    ballCenter[0] - position[0],
    ballCenter[1] +
      scene.ballRadius * CAMERA_CONFIG.lookAtYOffsetFactor -
      position[1],
    ballCenter[2] - position[2],
  ]);

  const right = normalizeVec3(crossVec3(forward, [0, 1, 0]));
  const up = crossVec3(right, forward);

  return { position, forward, right, up };
}

export function projectWorldToCanvas(
  worldPosition: Vec3,
  scene: SceneState,
  canvas: HTMLCanvasElement,
  cullMargin = 1.25,
): ProjectedPoint | null {
  const { position, forward, right, up } = getCameraPose(scene);

  const relative: Vec3 = [
    worldPosition[0] - position[0],
    worldPosition[1] - position[1],
    worldPosition[2] - position[2],
  ];

  const camX = dotVec3(relative, right);
  const camY = dotVec3(relative, up);
  const camZ = dotVec3(relative, forward);

  if (camZ <= 0.001) {
    return null;
  }

  const aspect = canvas.width / canvas.height;
  const uvX = camX / (camZ * aspect * CAMERA_CONFIG.fov);
  const uvY = camY / (camZ * CAMERA_CONFIG.fov);

  if (Math.abs(uvX) > cullMargin || Math.abs(uvY) > cullMargin) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();

  return {
    x: rect.left + (uvX * 0.5 + 0.5) * rect.width,
    y: rect.top + (0.5 - uvY * 0.5) * rect.height,
  };
}
