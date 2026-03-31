import { numberField, type ElementFields } from "@webgames/engine";
import { createBoxMesh, type Mesh } from "./mesh";
import { ShapeElement } from "./shape";

export class BoxElement extends ShapeElement {
  static readonly tag: string = "box";
  static readonly fields: ElementFields<any> = {
    width: numberField<BoxElement>("width"),
    height: numberField<BoxElement>("height"),
    depth: numberField<BoxElement>("depth"),
  } satisfies ElementFields<BoxElement>;

  width: number;
  height: number;
  depth: number;

  constructor() {
    super();
    this.width = 1;
    this.height = 1;
    this.depth = 1;
  }

  protected createMesh(): Mesh {
    return createBoxMesh(this.width, this.height, this.depth);
  }

  protected getMeshKey(): string {
    return `${this.width}:${this.height}:${this.depth}`;
  }
}
