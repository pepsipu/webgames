export { Engine } from "./engine";
export { createNode, setNodeParent } from "./nodes/node";
export { createScriptNode } from "./nodes/script";
export {
  createTransform,
  getWorldTransform,
  setRotationFromEuler,
} from "./nodes/transform";

export type { Camera, CameraNode } from "./nodes/camera";
export type { Node, NodeOptions } from "./nodes/node";
export type { Script, ScriptNode, ScriptNodeOptions } from "./nodes/script";
export type { Geometry, GeometryNode } from "./nodes/geometry";
export type { Material, MaterialNode } from "./nodes/material";
export type {
  BallOptions,
  BoxOptions,
  ShapeNode,
  TubeOptions,
} from "./nodes/shapes";

export type {
  Quaternion,
  Transform,
  TransformNode,
  TransformNodeOptions,
  Vector3,
} from "./nodes/transform";
