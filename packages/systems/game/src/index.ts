export { Quaternion } from "./math/quaternion";
export { Vector3 } from "./math/vector3";
export { Transform, hasTransform } from "./components/transform";
export { createCamera, hasCamera } from "./components/camera";
export { createBall, createBox, createTube } from "./components/shapes";
export { hasMesh } from "./components/mesh";
export { hasMaterial } from "./components/material";

export type {
  Camera,
  CameraComponent,
  CameraElement,
  CreateCameraOptions,
} from "./components/camera";
export type { Mesh, MeshComponent } from "./components/mesh";
export type { Material, MaterialComponent } from "./components/material";
export type {
  BallOptions,
  BoxOptions,
  ShapeComponent,
  TubeOptions,
} from "./components/shapes";
export type { TransformComponent } from "./components/transform";
