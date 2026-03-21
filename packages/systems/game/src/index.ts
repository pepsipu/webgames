export { Quaternion } from "./math/quaternion";
export { Vector3 } from "./math/vector3";
export { Transform, TransformElement } from "./components/transform";
export { CameraElement, createCamera } from "./components/camera";
export {
  ShapeElement,
  createBall,
  createBox,
  createTube,
} from "./components/shapes";
export type { Mesh } from "./components/mesh";
export type { Material } from "./components/material";

export type { CreateCameraOptions } from "./components/camera";
export type {
  BallOptions,
  BoxOptions,
  ShapeOptionsBase,
  TubeOptions,
} from "./components/shapes";
