import type { Element, Engine } from "@webgame/engine";
import type { UnparsedXmlNode } from "./parse-base";
import {
  getAttributes,
  getChildren,
  getType,
  parseXmlText,
} from "./parse-base";
import {
  createBallElement,
  createBoxElement,
  createButtonElement,
  createCameraElement,
  createScriptElement,
  createTubeElement,
} from "./element-helpers";

// loads the game file onto an engine instance.
export function loadGameFile(engine: Engine, text: string): void {
  const gameNode = parseXmlText(text);
  if (getType(gameNode) !== "game") {
    throw new Error(`Invalid XML: root node must be <game>. Found <${getType(gameNode)}> instead.`);
  }
  const children = getChildren(gameNode);
  for (const child of children) {
    loadElementTree(engine, child, engine.document);
  }
}

function loadElementTree(
  engine: Engine,
  element: UnparsedXmlNode,
  parent?: Element,
): void {
  const currentElement = createSingleElement(engine, element, parent);
  if (currentElement !== undefined && currentElement.parent === null) {
    parent?.append(currentElement);
  }
  const children = getChildren(element);
  for (const child of children) {
    loadElementTree(engine, child, currentElement ?? parent);
  }
}

function createSingleElement(
  engine: Engine,
  element: UnparsedXmlNode,
  parent?: Element,
): Element | undefined {
  let currentElement: Element | undefined;

  switch (getType(element)) {
    case "box":
      currentElement = createBoxElement(element);
      break;
    case "tube":
      currentElement = createTubeElement(element);
      break;
    case "ball":
      currentElement = createBallElement(element);
      break;
    case "camera":
      currentElement = createCameraElement(element);
      break;
    case "button":
      currentElement = createButtonElement(element);
      break;
    case "script":
      if (parent === undefined) {
        throw new Error("Script elements require a parent.");
      }

      currentElement = createScriptElement(engine, element, parent);
      break;
    default:
      return undefined;
  }

  if (currentElement !== undefined) {
    const attributes = getAttributes(element);
    const id = attributes.id;

    if (typeof id === "string") {
      currentElement.id = id;
    }
  }

  return currentElement;
}
