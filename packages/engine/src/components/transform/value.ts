import { Component, getComponent, type NodeWith } from "../component";
import { Quaternion } from "../../math/quaternion";
import { Vector3 } from "../../math/vector3";

export interface TransformState {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface TransformOptions {
  position?: Vector3;
  rotation?: Quaternion;
  scale?: Vector3;
}

export class Transform extends Component {
  static readonly key = "transform";
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;

  constructor(options: TransformOptions = {}) {
    super();
    this.position = Vector3.clone(options.position);
    this.rotation = Quaternion.clone(options.rotation);
    this.scale = Vector3.clone(options.scale, 1, 1, 1);
  }

  setPosition(x: number, y: number, z: number): void {
    Vector3.set(this.position, x, y, z);
  }

  setRotation(x: number, y: number, z: number, w: number): void {
    Quaternion.set(this.rotation, x, y, z, w);
  }

  setRotationFromEuler(x: number, y: number, z: number): void {
    Transform.setRotationFromEuler(this, x, y, z);
  }

  setScale(x: number, y: number, z: number): void {
    Vector3.set(this.scale, x, y, z);
  }

  static create(options: TransformOptions = {}): TransformState {
    return {
      position: Vector3.clone(options.position),
      rotation: Quaternion.clone(options.rotation),
      scale: Vector3.clone(options.scale, 1, 1, 1),
    };
  }

  static clone(
    source: TransformState | undefined,
    options: TransformOptions = {},
  ): TransformState {
    const output = Transform.create(options);

    if (source) {
      Transform.copy(output, source);
    }

    return output;
  }

  static copy(output: TransformState, source: TransformState): void {
    Vector3.copy(output.position, source.position);
    Quaternion.copy(output.rotation, source.rotation);
    Vector3.copy(output.scale, source.scale);
  }

  static set(
    output: TransformState,
    position: Vector3,
    rotation: Quaternion,
    scale: Vector3,
  ): void {
    Vector3.copy(output.position, position);
    Quaternion.copy(output.rotation, rotation);
    Vector3.copy(output.scale, scale);
  }

  static combine(
    output: TransformState,
    parent: TransformState,
    child: TransformState,
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

  static getWorld(
    output: TransformState,
    node: NodeWith<typeof Transform>,
  ): void {
    Transform.copy(output, node.transform);

    for (let parent = node.parent; parent !== null; parent = parent.parent) {
      const transform = getComponent(parent, Transform);

      if (transform) {
        Transform.combine(output, transform, output);
      }
    }
  }

  static setWorld(
    node: NodeWith<typeof Transform>,
    source: TransformState,
  ): void {
    const parentTransform = Transform.create();

    for (let parent = node.parent; parent !== null; parent = parent.parent) {
      const transform = getComponent(parent, Transform);

      if (transform) {
        Transform.combine(parentTransform, transform, parentTransform);
      }
    }

    const sourcePositionX = source.position[0];
    const sourcePositionY = source.position[1];
    const sourcePositionZ = source.position[2];
    const sourceRotationX = source.rotation[0];
    const sourceRotationY = source.rotation[1];
    const sourceRotationZ = source.rotation[2];
    const sourceRotationW = source.rotation[3];
    const sourceScaleX = source.scale[0];
    const sourceScaleY = source.scale[1];
    const sourceScaleZ = source.scale[2];

    const parentPositionX = parentTransform.position[0];
    const parentPositionY = parentTransform.position[1];
    const parentPositionZ = parentTransform.position[2];
    const parentRotationX = parentTransform.rotation[0];
    const parentRotationY = parentTransform.rotation[1];
    const parentRotationZ = parentTransform.rotation[2];
    const parentRotationW = parentTransform.rotation[3];
    const parentScaleX = parentTransform.scale[0];
    const parentScaleY = parentTransform.scale[1];
    const parentScaleZ = parentTransform.scale[2];

    const translatedX = sourcePositionX - parentPositionX;
    const translatedY = sourcePositionY - parentPositionY;
    const translatedZ = sourcePositionZ - parentPositionZ;
    const inverseRotationX = -parentRotationX;
    const inverseRotationY = -parentRotationY;
    const inverseRotationZ = -parentRotationZ;
    const inverseOffsetX =
      2 * (inverseRotationY * translatedZ - inverseRotationZ * translatedY);
    const inverseOffsetY =
      2 * (inverseRotationZ * translatedX - inverseRotationX * translatedZ);
    const inverseOffsetZ =
      2 * (inverseRotationX * translatedY - inverseRotationY * translatedX);
    const localPositionX =
      translatedX +
      parentRotationW * inverseOffsetX +
      (inverseRotationY * inverseOffsetZ - inverseRotationZ * inverseOffsetY);
    const localPositionY =
      translatedY +
      parentRotationW * inverseOffsetY +
      (inverseRotationZ * inverseOffsetX - inverseRotationX * inverseOffsetZ);
    const localPositionZ =
      translatedZ +
      parentRotationW * inverseOffsetZ +
      (inverseRotationX * inverseOffsetY - inverseRotationY * inverseOffsetX);

    Vector3.set(
      node.transform.position,
      localPositionX / parentScaleX,
      localPositionY / parentScaleY,
      localPositionZ / parentScaleZ,
    );

    Quaternion.set(
      node.transform.rotation,
      parentRotationW * sourceRotationX +
        inverseRotationX * sourceRotationW +
        inverseRotationY * sourceRotationZ -
        inverseRotationZ * sourceRotationY,
      parentRotationW * sourceRotationY -
        inverseRotationX * sourceRotationZ +
        inverseRotationY * sourceRotationW +
        inverseRotationZ * sourceRotationX,
      parentRotationW * sourceRotationZ +
        inverseRotationX * sourceRotationY -
        inverseRotationY * sourceRotationX +
        inverseRotationZ * sourceRotationW,
      parentRotationW * sourceRotationW -
        inverseRotationX * sourceRotationX -
        inverseRotationY * sourceRotationY -
        inverseRotationZ * sourceRotationZ,
    );

    Vector3.set(
      node.transform.scale,
      sourceScaleX / parentScaleX,
      sourceScaleY / parentScaleY,
      sourceScaleZ / parentScaleZ,
    );
  }

  static setRotationFromEuler(
    output: TransformState,
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
      output.rotation,
      sinX * cosY * cosZ - cosX * sinY * sinZ,
      cosX * sinY * cosZ + sinX * cosY * sinZ,
      cosX * cosY * sinZ - sinX * sinY * cosZ,
      cosX * cosY * cosZ + sinX * sinY * sinZ,
    );
  }
}
