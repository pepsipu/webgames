export { Engine } from "./engine";
export { Quaternion } from "./math/quaternion";
export { Vector3 } from "./math/vector3";
export { createNode } from "./nodes/node";
export {
  createCamera,
  hasCamera,
} from "./nodes/camera";
export {
  createScript,
  hasScript,
} from "./nodes/script";
export { createBall, createBox, createTube } from "./nodes/shapes";
export { hasGeometry } from "./nodes/geometry";
export { hasMaterial } from "./nodes/material";
export {
  createTransform,
  getWorldTransform,
  hasTransform,
  setRotationFromEuler,
} from "./nodes/transform";

export type {
  Camera,
  CameraComponent,
  CameraNode,
  CameraOptions,
  CreateCameraOptions,
} from "./nodes/camera";
export type { Node } from "./nodes/node";
export type {
  Script,
  ScriptComponent,
  ScriptOptions,
} from "./nodes/script";
export type { Geometry, GeometryComponent } from "./nodes/geometry";
export type { Material, MaterialComponent } from "./nodes/material";
export type {
  BallOptions,
  BoxOptions,
  ShapeComponent,
  TubeOptions,
} from "./nodes/shapes";

export type {
  Transform,
  TransformComponent,
  TransformOptions,
} from "./nodes/transform";
