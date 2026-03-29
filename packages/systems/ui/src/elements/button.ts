import type { UiDomNode } from "../dom-node";
import { UiElement } from "./base";
import { script } from "@webgames/engine";

export class ButtonElement extends UiElement {
  #clicked: boolean;

  constructor(text = "") {
    super("button", text);
    this.#clicked = false;
  }

  markClicked(): void {
    this.#clicked = true;
  }

  override clearFrame(): void {
    this.#clicked = false;
  }

  @script()
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
