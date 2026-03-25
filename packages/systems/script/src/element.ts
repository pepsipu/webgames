import { Element } from "@webgames/engine";

export class ScriptElement extends Element {
  readonly source: string;

  constructor(source: string) {
    super();
    this.source = source;
  }
}
