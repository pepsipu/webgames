import { Element } from "@webgames/engine";
import { Vector3, type Vector3 as Vector3Value } from "@webgames/game";

export class SphericalJointElement extends Element {
  jointType: "spherical";
  body1: string;
  body2: string;
  anchor1: Vector3Value;
  anchor2: Vector3Value;

  constructor(
    body1: string,
    body2: string,
    anchor1: Vector3Value,
    anchor2: Vector3Value,
  ) {
    super();
    this.jointType = "spherical";
    this.body1 = body1;
    this.body2 = body2;
    this.anchor1 = Vector3.clone(anchor1);
    this.anchor2 = Vector3.clone(anchor2);
  }
}
