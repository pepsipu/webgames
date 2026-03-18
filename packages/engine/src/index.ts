export { Engine } from "./engine";
export { Quaternion } from "./math/quaternion";
export { Vector3 } from "./math/vector3";
export { createNode } from "./node";
export { Transform, hasTransform } from "./components/transform";
export {
  clearInputFrame,
  createInputService,
  hasInputService,
  pressKey,
  releaseKey,
  resetInput,
} from "./components/input";
export { createCamera, hasCamera } from "./components/camera";
export {
  createScriptService,
  hasScriptService,
} from "./components/script/service";
export { createScript, hasScript } from "./components/script";
export { createBall, createBox, createTube } from "./components/shapes";
export { hasMesh } from "./components/mesh";
export { hasMaterial } from "./components/material";

export type {
  Camera,
  CameraComponent,
  CameraNode,
  CreateCameraOptions,
} from "./components/camera";
export type { Node } from "./node";
export type {
  Input,
  InputComponent,
  InputServiceNode,
} from "./components/input";
export type {
  ScriptService,
  ScriptServiceComponent,
  ScriptServiceNode,
} from "./components/script/service";
export type {
  Script,
  ScriptComponent,
  ScriptOptions,
} from "./components/script";
export type { Mesh, MeshComponent } from "./components/mesh";
export type { Material, MaterialComponent } from "./components/material";
export type {
  BallOptions,
  BoxOptions,
  ShapeComponent,
  TubeOptions,
} from "./components/shapes";

export type { TransformComponent } from "./components/transform";
