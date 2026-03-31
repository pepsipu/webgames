import type { ElementField, ElementFields } from "@webgames/engine";
import { Element } from "@webgames/engine";
import { Quaternion } from "../../math/quaternion";
import { Vector3 } from "../../math/vector3";
import { Transform } from "./value";

export class TransformElement extends Element {
  static readonly tag: string = "transform";
  static readonly scriptMethods: readonly string[] = [
    "setPosition",
    "setRotation",
    "setRotationFromEuler",
    "setScale",
  ];
  static readonly fields: ElementFields<any> = {
    position: vector3Field<TransformElement>(
      "position",
      (element) => element.transform.position,
    ),
    rotation: createRotationField(),
    scale: vector3Field<TransformElement>(
      "scale",
      (element) => element.transform.scale,
    ),
  } satisfies ElementFields<TransformElement>;

  transform: Transform;

  constructor() {
    super();
    this.transform = Transform.create();
  }

  setPosition(x: number, y: number, z: number): void {
    this.transform.position[0] = x;
    this.transform.position[1] = y;
    this.transform.position[2] = z;
  }

  setRotation(x: number, y: number, z: number, w: number): void {
    this.transform.rotation[0] = x;
    this.transform.rotation[1] = y;
    this.transform.rotation[2] = z;
    this.transform.rotation[3] = w;
  }

  setRotationFromEuler(x: number, y: number, z: number): void {
    Transform.setRotationFromEuler(this.transform, x, y, z);
  }

  setScale(x: number, y: number, z: number): void {
    this.transform.scale[0] = x;
    this.transform.scale[1] = y;
    this.transform.scale[2] = z;
  }
}

function requireVector3(value: unknown, key: string): [number, number, number] {
  if (typeof value === "string") {
    return parseVector3String(value, key);
  }

  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => typeof entry === "number")
  ) {
    return [value[0], value[1], value[2]];
  }

  throw new Error(`Field "${key}" must be a 3D vector.`);
}

function requireQuaternion(
  value: unknown,
  key: string,
): [number, number, number, number] {
  if (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((entry) => typeof entry === "number")
  ) {
    return [value[0], value[1], value[2], value[3]];
  }

  throw new Error(`Field "${key}" must be a quaternion.`);
}

function parseVector3String(
  value: string,
  key: string,
): [number, number, number] {
  const parts = value
    .trim()
    .split(" ")
    .map((entry) => parseFloat(entry));

  if (parts.length !== 3 || parts.some((entry) => Number.isNaN(entry))) {
    throw new Error(`Field "${key}" must be three numbers.`);
  }

  return [parts[0], parts[1], parts[2]];
}

export function vector3Field<TElement extends Element>(
  key: string,
  get: (element: TElement) => Vector3,
): ElementField<TElement> {
  return {
    get: (element) => Vector3.clone(get(element)),
    set: (element, value) => {
      Vector3.copy(get(element), requireVector3(value, key));
    },
  };
}

function createRotationField(): ElementField<TransformElement> {
  return {
    get: (element) => Quaternion.clone(element.transform.rotation),
    set: (element, value) => {
      if (typeof value === "string") {
        const [x, y, z] = parseVector3String(value, "rotation");

        Transform.setRotationFromEuler(element.transform, x, y, z);
        return;
      }

      Quaternion.copy(
        element.transform.rotation,
        requireQuaternion(value, "rotation"),
      );
    },
  };
}
