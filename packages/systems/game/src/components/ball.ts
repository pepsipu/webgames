import { numberField, type ElementFields } from "@webgames/engine";
import { createBallMesh, type Mesh } from "./mesh";
import { ShapeElement } from "./shape";

export class BallElement extends ShapeElement {
  static readonly tag: string = "ball";
  static readonly fields: ElementFields<any> = {
    radius: numberField<BallElement>("radius"),
    segments: numberField<BallElement>("segments"),
    rings: numberField<BallElement>("rings"),
  } satisfies ElementFields<BallElement>;

  radius: number;
  segments: number;
  rings: number;

  constructor() {
    super();
    this.radius = 0.5;
    this.segments = 20;
    this.rings = 14;
  }

  protected createMesh(): Mesh {
    return createBallMesh(this.radius, this.segments, this.rings);
  }

  protected getMeshKey(): string {
    return `${this.radius}:${this.segments}:${this.rings}`;
  }
}
