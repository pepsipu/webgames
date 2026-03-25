import type { UiDomNode } from "../dom-node";
import { UiElement } from "./base";

export class ParagraphElement extends UiElement {
  constructor(text = "") {
    super("p", text);
  }

  override createDomNode(): UiDomNode {
    const paragraph = document.createElement("p");

    paragraph.dataset.webgamesUi = this.uiType;
    return {
      element: paragraph,
      destroy() {
        paragraph.remove();
      },
    };
  }
}
