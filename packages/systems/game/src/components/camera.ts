import { numberField, type ElementFields } from "@webgames/engine";
import { TransformElement } from "./transform";

export class CameraElement extends TransformElement {
  static readonly tag: string = "camera";
  static readonly fields: ElementFields<any> = {
    fovY: numberField<CameraElement>("fovY"),
    near: numberField<CameraElement>("near"),
    far: numberField<CameraElement>("far"),
  } satisfies ElementFields<CameraElement>;

  fovY: number;
  near: number;
  far: number;

  constructor() {
    super();
    this.fovY = Math.PI / 3;
    this.near = 0.1;
    this.far = 100;
  }
}
