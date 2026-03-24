import { Element, script } from "@webgames/engine";
import { Transform } from "./value";

export class TransformElement extends Element {
  transform: Transform;

  constructor(transform: Transform) {
    super();
    this.transform = Transform.clone(transform);
  }

  @script()
  setPosition(x: number, y: number, z: number): void {
    this.transform.position[0] = x;
    this.transform.position[1] = y;
    this.transform.position[2] = z;
  }

  @script()
  setRotation(x: number, y: number, z: number, w: number): void {
    this.transform.rotation[0] = x;
    this.transform.rotation[1] = y;
    this.transform.rotation[2] = z;
    this.transform.rotation[3] = w;
  }

  @script()
  setRotationFromEuler(x: number, y: number, z: number): void {
    Transform.setRotationFromEuler(this.transform, x, y, z);
  }

  @script()
  setScale(x: number, y: number, z: number): void {
    this.transform.scale[0] = x;
    this.transform.scale[1] = y;
    this.transform.scale[2] = z;
  }
}
