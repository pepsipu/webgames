import { Quaternion } from "../math/quaternion";
import { Vector3 } from "../math/vector3";
import type { Node } from "../node";

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export type TransformComponent = { transform: Transform };

export interface TransformOptions {
  position?: Vector3;
  rotation?: Quaternion;
  scale?: Vector3;
}

export function createTransform(options: TransformOptions = {}): Transform {
  return {
    position: Vector3.clone(options.position),
    rotation: Quaternion.clone(options.rotation),
    scale: Vector3.clone(options.scale, 1, 1, 1),
  };
}

export function hasTransform(node: Node): node is Node & TransformComponent {
  return (node as { transform?: Transform }).transform !== undefined;
}

export function copyTransform(output: Transform, source: Transform): void {
  Vector3.copy(output.position, source.position);
  Quaternion.copy(output.rotation, source.rotation);
  Vector3.copy(output.scale, source.scale);
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

  Vector3.set(
    output.position,
    parentPositionX + rotatedX,
    parentPositionY + rotatedY,
    parentPositionZ + rotatedZ,
  );

  Quaternion.set(
    output.rotation,
    parentRotationW * childRotationX +
      parentRotationX * childRotationW +
      parentRotationY * childRotationZ -
      parentRotationZ * childRotationY,
    parentRotationW * childRotationY -
      parentRotationX * childRotationZ +
      parentRotationY * childRotationW +
      parentRotationZ * childRotationX,
    parentRotationW * childRotationZ +
      parentRotationX * childRotationY -
      parentRotationY * childRotationX +
      parentRotationZ * childRotationW,
    parentRotationW * childRotationW -
      parentRotationX * childRotationX -
      parentRotationY * childRotationY -
      parentRotationZ * childRotationZ,
  );

  Vector3.set(
    output.scale,
    parentScaleX * childScaleX,
    parentScaleY * childScaleY,
    parentScaleZ * childScaleZ,
  );
}

export function getWorldTransform(
  output: Transform,
  node: Node & TransformComponent,
): void {
  copyTransform(output, node.transform);

  for (let parent = node.parent; parent !== null; parent = parent.parent) {
    if (hasTransform(parent)) {
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

  Quaternion.set(
    rotation,
    sinX * cosY * cosZ - cosX * sinY * sinZ,
    cosX * sinY * cosZ + sinX * cosY * sinZ,
    cosX * cosY * sinZ - sinX * sinY * cosZ,
    cosX * cosY * cosZ + sinX * sinY * sinZ,
  );
}
