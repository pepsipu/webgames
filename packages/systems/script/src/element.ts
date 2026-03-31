import { Element, stringField, type ElementFields } from "@webgames/engine";

export class ScriptElement extends Element {
  static readonly tag: string = "script";
  static readonly fields: ElementFields<any> = {
    text: stringField<ScriptElement>("text"),
  } satisfies ElementFields<ScriptElement>;

  text: string;

  constructor() {
    super();
    this.text = "";
  }
}
