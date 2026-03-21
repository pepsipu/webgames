export class Element {
  #id: string | null;
  #parent: Element | null;
  #children: Element[];

  constructor() {
    this.#id = null;
    this.#parent = null;
    this.#children = [];
  }

  get id(): string | null {
    return this.#id;
  }

  set id(value: string | null) {
    this.#id = value;
  }

  get parent(): Element | null {
    return this.#parent;
  }

  set parent(value: Element | null) {
    this.#parent = value;
  }

  get children(): readonly Element[] {
    return this.#children;
  }

  get childElementCount(): number {
    return this.#children.length;
  }

  get firstElementChild(): Element | null {
    return this.#children[0] ?? null;
  }

  get lastElementChild(): Element | null {
    return this.#children[this.#children.length - 1] ?? null;
  }

  append(...elements: Element[]): void {
    for (const element of elements) {
      this.moveBefore(element, null);
    }
  }

  prepend(...elements: Element[]): void {
    const reference = this.firstElementChild;

    for (const element of elements) {
      this.moveBefore(element, reference);
    }
  }

  moveBefore(element: Element, child: Element | null): void {
    if (child !== null && child.parent !== this) {
      throw new Error("The reference element must be a child of this element.");
    }

    if (element === child) {
      return;
    }

    this.#assertCanAdopt(element);
    element.parent?.removeChild(element);
    element.parent = this;

    if (child === null) {
      this.#children.push(element);
      return;
    }

    const index = this.#children.indexOf(child);

    if (index === -1) {
      throw new Error("Element child links are out of sync.");
    }

    this.#children.splice(index, 0, element);
  }

  replaceChildren(...elements: Element[]): void {
    while (this.#children.length > 0) {
      this.removeChild(this.#children[0]);
    }

    this.append(...elements);
  }

  removeChild(element: Element): void {
    const index = this.#children.indexOf(element);

    if (index === -1) {
      throw new Error("Element child links are out of sync.");
    }

    this.#children.splice(index, 1);
    element.parent = null;
  }

  remove(): void {
    this.#parent?.removeChild(this);
  }

  #assertCanAdopt(element: Element): void {
    for (
      let current: Element | null = this;
      current !== null;
      current = current.parent
    ) {
      if (current === element) {
        throw new Error(
          "An element cannot be parented to itself or one of its children.",
        );
      }
    }
  }
}

export function createElement<T extends object = {}>(
  properties: T = {} as T,
): Element & T {
  return Object.assign(new Element(), properties);
}
