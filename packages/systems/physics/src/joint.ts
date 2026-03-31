import type { ElementFields } from "@webgames/engine";
import { Element, stringField } from "@webgames/engine";
import {
  Vector3,
  type Vector3 as Vector3Value,
  vector3Field,
} from "@webgames/game";

export class SphericalJointElement extends Element {
  static readonly tag: string = "spherical-joint";
  static readonly replicated: boolean = false;
  static readonly fields: ElementFields<any> = {
    body1: stringField<SphericalJointElement>("body1"),
    body2: stringField<SphericalJointElement>("body2"),
    anchor1: vector3Field<SphericalJointElement>(
      "anchor1",
      (element) => element.anchor1,
    ),
    anchor2: vector3Field<SphericalJointElement>(
      "anchor2",
      (element) => element.anchor2,
    ),
  } satisfies ElementFields<SphericalJointElement>;

  body1: string;
  body2: string;
  anchor1: Vector3Value;
  anchor2: Vector3Value;

  constructor() {
    super();
    this.body1 = "";
    this.body2 = "";
    this.anchor1 = Vector3.create();
    this.anchor2 = Vector3.create();
  }
}
