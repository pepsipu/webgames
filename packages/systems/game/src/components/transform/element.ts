import { Element } from "@webgames/engine";
import { Transform } from "./value";

export class TransformElement extends Element {
  transform: Transform;

  constructor(transform: Transform) {
    super();
    this.transform = Transform.clone(transform);
  }
}
