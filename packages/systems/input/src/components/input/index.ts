import { Element } from "@webgames/engine";

export class InputServiceElement extends Element {
  down: Set<string>;
  pressed: Set<string>;
  released: Set<string>;

  constructor() {
    super();
    this.id = "input";
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
  }
}

export function createInputService(): InputServiceElement {
  return new InputServiceElement();
}

export function getInputService(root: Element): InputServiceElement {
  const service = root.children.find(
    (child): child is InputServiceElement =>
      child instanceof InputServiceElement,
  );

  if (service === undefined) {
    throw new Error("Input system is not installed.");
  }

  return service;
}

// TODO: mby these functions should be methods on InputServiceElement?
export function pressKey(element: InputServiceElement, code: string): void {
  if (element.down.has(code)) {
    return;
  }

  element.down.add(code);
  element.pressed.add(code);
}

export function releaseKey(element: InputServiceElement, code: string): void {
  if (!element.down.has(code)) {
    return;
  }

  element.down.delete(code);
  element.released.add(code);
}

export function clearInputFrame(element: InputServiceElement): void {
  element.pressed.clear();
  element.released.clear();
}

export function resetInput(element: InputServiceElement): void {
  element.down.clear();
  clearInputFrame(element);
}
