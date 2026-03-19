import { createNode, getRootNode, type Node } from "../../node";

export interface Input {
  down: Set<string>;
  pressed: Set<string>;
  released: Set<string>;
}

export type InputComponent = { input: Input };
export type InputServiceNode = Node & InputComponent;

export function createInputService(): InputServiceNode {
  return createNode({
    input: {
      down: new Set(),
      pressed: new Set(),
      released: new Set(),
    },
  });
}

export function hasInputService(node: Node): node is InputServiceNode {
  return "input" in node;
}

export function getInputService(node: Node): InputServiceNode {
  const service = getRootNode(node).children.find(hasInputService);

  if (service === undefined) {
    throw new Error("Input system is not installed.");
  }

  return service;
}

export function pressKey(node: InputServiceNode, code: string): void {
  if (node.input.down.has(code)) {
    return;
  }

  node.input.down.add(code);
  node.input.pressed.add(code);
}

export function releaseKey(node: InputServiceNode, code: string): void {
  if (!node.input.down.has(code)) {
    return;
  }

  node.input.down.delete(code);
  node.input.released.add(code);
}

export function clearInputFrame(node: InputServiceNode): void {
  node.input.pressed.clear();
  node.input.released.clear();
}

export function resetInput(node: InputServiceNode): void {
  node.input.down.clear();
  clearInputFrame(node);
}
