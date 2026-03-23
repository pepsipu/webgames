import type { Element as EngineElement } from "@webgames/engine";
import type { UiDomNode } from "./dom-node";
import { UiElement } from "./elements";

export class UiOverlay {
  readonly #nodes: Map<UiElement, UiDomNode>;
  readonly root: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.#nodes = new Map();
    this.root = root;
  }

  render(root: EngineElement): void {
    const used = new Set<UiElement>();
    const children = this.#collectChildren(root, used);

    this.root.replaceChildren(...children);

    for (const [element, node] of this.#nodes) {
      if (used.has(element)) {
        continue;
      }

      node.destroy();
      this.#nodes.delete(element);
    }
  }

  clearFrame(): void {
    for (const element of this.#nodes.keys()) {
      element.clearFrame();
    }
  }

  destroy(): void {
    for (const node of this.#nodes.values()) {
      node.destroy();
    }

    this.#nodes.clear();
    this.root.replaceChildren();
  }

  #collectChildren(parent: EngineElement, used: Set<UiElement>): HTMLElement[] {
    const children: HTMLElement[] = [];

    for (const child of parent.children) {
      if (child instanceof UiElement) {
        children.push(this.#syncElement(child, used));
        continue;
      }

      children.push(...this.#collectChildren(child, used));
    }

    return children;
  }

  #syncElement(element: UiElement, used: Set<UiElement>): HTMLElement {
    used.add(element);

    const node = this.#getOrCreateNode(element);
    const children = this.#collectChildren(element, used);

    if (element.text.length > 0) {
      node.replaceChildren(element.text, ...children);
    } else {
      node.replaceChildren(...children);
    }

    return node;
  }

  #getOrCreateNode(element: UiElement): HTMLElement {
    const existing = this.#nodes.get(element);

    if (existing !== undefined) {
      return existing.element;
    }

    const node = element.createDomNode();

    this.#nodes.set(element, node);
    return node.element;
  }
}
