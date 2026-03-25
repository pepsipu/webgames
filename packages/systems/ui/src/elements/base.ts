import { Element, script } from "@webgames/engine";
import type { UiDomNode } from "../dom-node";

type UiElementType = "p" | "button";

export abstract class UiElement extends Element {
  readonly uiType: UiElementType;
  text: string;

  constructor(uiType: UiElementType, text = "") {
    super();
    this.uiType = uiType;
    this.text = text;
  }

  @script()
  getText(): string {
    return this.text;
  }

  @script()
  setText(text: string): void {
    this.text = text;
  }

  clearFrame(): void {}

  abstract createDomNode(): UiDomNode;
}
