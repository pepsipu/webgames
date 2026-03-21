import {
  createElement,
  type Element,
} from "@webgame/engine";

export interface Input {
  down: Set<string>;
  pressed: Set<string>;
  released: Set<string>;
}

export type InputComponent = { input: Input };
export type InputServiceElement = Element & InputComponent;

export function createInputService(): InputServiceElement {
  return createElement({
    id: "input",
    input: {
      down: new Set(),
      pressed: new Set(),
      released: new Set(),
    },
  });
}

export function hasInputService(element: Element): element is InputServiceElement {
  return "input" in element;
}

export function getInputService(root: Element): InputServiceElement {
  const service = root.children.find(hasInputService);

  if (service === undefined) {
    throw new Error("Input system is not installed.");
  }

  return service;
}

export function pressKey(element: InputServiceElement, code: string): void {
  if (element.input.down.has(code)) {
    return;
  }

  element.input.down.add(code);
  element.input.pressed.add(code);
}

export function releaseKey(element: InputServiceElement, code: string): void {
  if (!element.input.down.has(code)) {
    return;
  }

  element.input.down.delete(code);
  element.input.released.add(code);
}

export function clearInputFrame(element: InputServiceElement): void {
  element.input.pressed.clear();
  element.input.released.clear();
}

export function resetInput(element: InputServiceElement): void {
  element.input.down.clear();
  clearInputFrame(element);
}

export { inputScriptable } from "./scriptable";
