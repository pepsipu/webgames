import {
  createNode,
  type Node,
  type NodeOptions,
} from "./node";

export type Vector3 = [number, number, number];

export type Quaternion = [number, number, number, number];

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface TransformNode extends Node {
  transform: Transform;
}

export interface TransformNodeOptions extends NodeOptions {
  x?: number;
  y?: number;
  z?: number;
}

export function createTransform(
  x = 0,
  y = 0,
  z = 0,
): Transform {
  return {
    position: [x, y, z],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  };
}

export function createTransformNode(
  x = 0,
  y = 0,
  z = 0,
): TransformNode {
  return {
    ...createNode(),
    transform: createTransform(x, y, z),
  };
}

function isTransformNode(node: Node): node is TransformNode {
  return "transform" in node;
}

export function copyTransform(output: Transform, source: Transform): void {
  output.position[0] = source.position[0];
  output.position[1] = source.position[1];
  output.position[2] = source.position[2];
  output.rotation[0] = source.rotation[0];
  output.rotation[1] = source.rotation[1];
  output.rotation[2] = source.rotation[2];
  output.rotation[3] = source.rotation[3];
  output.scale[0] = source.scale[0];
  output.scale[1] = source.scale[1];
  output.scale[2] = source.scale[2];
}

export function combineTransforms(
  output: Transform,
  parent: Transform,
  child: Transform,
): void {
  const childPositionX = child.position[0];
  const childPositionY = child.position[1];
  const childPositionZ = child.position[2];
  const childRotationX = child.rotation[0];
  const childRotationY = child.rotation[1];
  const childRotationZ = child.rotation[2];
  const childRotationW = child.rotation[3];
  const childScaleX = child.scale[0];
  const childScaleY = child.scale[1];
  const childScaleZ = child.scale[2];

  const parentPositionX = parent.position[0];
  const parentPositionY = parent.position[1];
  const parentPositionZ = parent.position[2];
  const parentRotationX = parent.rotation[0];
  const parentRotationY = parent.rotation[1];
  const parentRotationZ = parent.rotation[2];
  const parentRotationW = parent.rotation[3];
  const parentScaleX = parent.scale[0];
  const parentScaleY = parent.scale[1];
  const parentScaleZ = parent.scale[2];

  const scaledX = parentScaleX * childPositionX;
  const scaledY = parentScaleY * childPositionY;
  const scaledZ = parentScaleZ * childPositionZ;
  const offsetX = 2 * (parentRotationY * scaledZ - parentRotationZ * scaledY);
  const offsetY = 2 * (parentRotationZ * scaledX - parentRotationX * scaledZ);
  const offsetZ = 2 * (parentRotationX * scaledY - parentRotationY * scaledX);
  const rotatedX =
    scaledX +
    parentRotationW * offsetX +
    (parentRotationY * offsetZ - parentRotationZ * offsetY);
  const rotatedY =
    scaledY +
    parentRotationW * offsetY +
    (parentRotationZ * offsetX - parentRotationX * offsetZ);
  const rotatedZ =
    scaledZ +
    parentRotationW * offsetZ +
    (parentRotationX * offsetY - parentRotationY * offsetX);

  output.position[0] = parentPositionX + rotatedX;
  output.position[1] = parentPositionY + rotatedY;
  output.position[2] = parentPositionZ + rotatedZ;

  output.rotation[0] =
    parentRotationW * childRotationX +
    parentRotationX * childRotationW +
    parentRotationY * childRotationZ -
    parentRotationZ * childRotationY;
  output.rotation[1] =
    parentRotationW * childRotationY -
    parentRotationX * childRotationZ +
    parentRotationY * childRotationW +
    parentRotationZ * childRotationX;
  output.rotation[2] =
    parentRotationW * childRotationZ +
    parentRotationX * childRotationY -
    parentRotationY * childRotationX +
    parentRotationZ * childRotationW;
  output.rotation[3] =
    parentRotationW * childRotationW -
    parentRotationX * childRotationX -
    parentRotationY * childRotationY -
    parentRotationZ * childRotationZ;

  output.scale[0] = parentScaleX * childScaleX;
  output.scale[1] = parentScaleY * childScaleY;
  output.scale[2] = parentScaleZ * childScaleZ;
}

export function getWorldTransform(
  output: Transform,
  node: TransformNode,
): void {
  copyTransform(output, node.transform);

  for (let parent = node.parent; parent !== null; parent = parent.parent) {
    if (isTransformNode(parent)) {
      combineTransforms(output, parent.transform, output);
    }
  }
}

export function setRotationFromEuler(
  rotation: Quaternion,
  x: number,
  y: number,
  z: number,
): void {
  const halfX = x * 0.5;
  const halfY = y * 0.5;
  const halfZ = z * 0.5;
  const sinX = Math.sin(halfX);
  const cosX = Math.cos(halfX);
  const sinY = Math.sin(halfY);
  const cosY = Math.cos(halfY);
  const sinZ = Math.sin(halfZ);
  const cosZ = Math.cos(halfZ);

  rotation[0] = sinX * cosY * cosZ - cosX * sinY * sinZ;
  rotation[1] = cosX * sinY * cosZ + sinX * cosY * sinZ;
  rotation[2] = cosX * cosY * sinZ - sinX * sinY * cosZ;
  rotation[3] = cosX * cosY * cosZ + sinX * sinY * sinZ;
}
