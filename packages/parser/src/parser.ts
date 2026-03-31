import type { ElementSnapshot, Engine } from "@webgames/engine";
import type { UnparsedXmlNode } from "./parse-base";
import {
  getAttributes,
  getChildren,
  getText,
  getType,
  parseXmlText,
} from "./parse-base";

// loads the game file onto an engine instance.
export function loadGameFile(engine: Engine, text: string): void {
  engine.registry.applySnapshot(engine.document, parseGameFile(text));
}

export function parseGameFile(text: string): ElementSnapshot {
  const gameNode = parseXmlText(text);
  if (getType(gameNode) !== "game") {
    throw new Error(
      `Invalid XML: root node must be <game>. Found <${getType(gameNode)}> instead.`,
    );
  }

  return createSnapshot(gameNode);
}

function createSnapshot(element: UnparsedXmlNode): ElementSnapshot {
  const snapshot: ElementSnapshot = {
    tag: getType(element),
    children: getChildren(element).map(createSnapshot),
  };
  const attributes = getAttributes(element);

  if (typeof attributes.name === "string") {
    snapshot.name = attributes.name;
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (key === "name") {
      continue;
    }

    snapshot[key] = value;
  }

  const text = getText(element);

  if (text !== undefined) {
    snapshot.text = text;
  }

  return snapshot;
}
