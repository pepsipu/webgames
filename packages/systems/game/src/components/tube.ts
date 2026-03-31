import { numberField, type ElementFields } from "@webgames/engine";
import { createTubeMesh, type Mesh } from "./mesh";
import { ShapeElement } from "./shape";

export class TubeElement extends ShapeElement {
  static readonly tag: string = "tube";
  static readonly fields: ElementFields<any> = {
    radius: numberField<TubeElement>("radius"),
    height: numberField<TubeElement>("height"),
    segments: numberField<TubeElement>("segments"),
  } satisfies ElementFields<TubeElement>;

  radius: number;
  height: number;
  segments: number;

  constructor() {
    super();
    this.radius = 0.5;
    this.height = 1;
    this.segments = 24;
  }

  protected createMesh(): Mesh {
    return createTubeMesh(this.radius, this.height, this.segments);
  }

  protected getMeshKey(): string {
    return `${this.radius}:${this.height}:${this.segments}`;
  }
}
