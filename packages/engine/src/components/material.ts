import { Component } from "./component";
import { Vector3 } from "../math/vector3";

export class Material extends Component {
  static readonly key = "material";
  color: Vector3;

  constructor(color?: Vector3) {
    super();
    this.color = Vector3.clone(color, 1, 1, 1);
  }

  setColor(r: number, g: number, b: number): void {
    Vector3.set(this.color, r, g, b);
  }
}
