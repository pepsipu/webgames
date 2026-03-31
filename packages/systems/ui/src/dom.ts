import { type Element as EngineElement, walkElements } from "@webgames/engine";
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
    const children: HTMLElement[] = [];

    for (const element of walkElements(root)) {
      if (element instanceof UiElement) {
        children.push(this.#syncElement(element, used));
      }
    }

    if (
      children.length !== this.root.children.length ||
      children.some((child, index) => this.root.children[index] !== child)
    ) {
      this.root.replaceChildren(...children);
    }

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

  #syncElement(element: UiElement, used: Set<UiElement>): HTMLElement {
    used.add(element);

    const node = this.#getOrCreateNode(element);

    if (node.textContent !== element.text) {
      node.textContent = element.text;
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
