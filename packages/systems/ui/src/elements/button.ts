import type { UiDomNode } from "../dom-node";
import { UiElement } from "./base";

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

  wasClicked(): boolean {
    return this.#clicked;
  }

  override createDomNode(): UiDomNode {
    const button = document.createElement("button");
    const onClick = (): void => {
      this.markClicked();
    };

    button.type = "button";
    button.style.pointerEvents = "auto";
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

export function createButton(text = ""): ButtonElement {
  return new ButtonElement(text);
}
