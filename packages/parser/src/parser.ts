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
    id: null,
    class: [],
    children: getChildren(element).map(createSnapshot),
  };
  const attributes = getAttributes(element);

  for (const [key, value] of Object.entries(attributes)) {
    // TODO: this element specific logic in the parser, would be nice to avoid this
    if (key === "class") {
      snapshot.class = value.split(/\s+/).filter(Boolean);
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
