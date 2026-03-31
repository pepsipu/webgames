import type { UiDomNode } from "../dom-node";
import { UiElement } from "./base";

export class ButtonElement extends UiElement {
  static readonly tag: string = "button";
  static readonly scriptMethods: readonly string[] = ["wasClicked"];

  #clicked: boolean;

  constructor() {
    super("button");
    this.#clicked = false;
  }

  markClicked(): void {
    this.#clicked = true;
  }

  override clearFrame(): void {
    this.#clicked = false;
  }

  wasClicked(): boolean {
    return this.#clicked;
  }

  override createDomNode(): UiDomNode {
    const button = document.createElement("button");
    const onClick = (): void => {
      this.markClicked();
    };

    button.type = "button";
    button.dataset.webgamesUi = this.uiType;
    button.addEventListener("click", onClick);

    return {
      element: button,
      destroy() {
        button.removeEventListener("click", onClick);
        button.remove();
      },
    };
  }
}
