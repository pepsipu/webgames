import type { Engine, Node } from "@webgame/engine";
import type { UnparsedXmlNode } from "./parse-base";
import { parseXmlText, getChildren, getType } from "./parse-base";
import { createBoxNode, createTubeNode, createBallNode, createButtonNode, createScriptNode } from "./node-helpers";

// loads the game file onto an engine instance.
export async function loadGameFile(engine: Engine, text: string): Promise<void> {
  const gameNode = parseXmlText(text);
  if (getType(gameNode) !== "game") {
    throw new Error(`Invalid XML: root node must be <game>. Found <${getType(gameNode)}> instead.`);
  }
  const children = getChildren(gameNode);
  for (const child of children) {
    await loadNodeTree(engine, child, engine.scene); // engine.scene is the root node
  }
}

async function loadNodeTree(engine: Engine, node: UnparsedXmlNode, parent?: Node): Promise<void> {
  // recursively loads the tree of nodes
  const currentNode = await createSingleNode(engine, node, parent);
  if (currentNode !== undefined) {
    engine.addNode(currentNode, parent); // add to game engine with a parent
  }
  const children = getChildren(node);
  for (const child of children) {
    // pass through parent if current node is unrecognized and thus not created
    await loadNodeTree(engine, child, currentNode ?? parent);
  }
}

async function createSingleNode(engine: Engine, node: UnparsedXmlNode, parent?: Node): Promise<Node | undefined> {
  // creates a game engine node using the context, or none if the node type is unrecognized.
  switch (getType(node)) {
    case "box": return createBoxNode(engine, node);
    case "tube": return createTubeNode(engine, node);
    case "ball": return createBallNode(engine, node);
    case "button": return createButtonNode(engine, node);
    case "script": return await createScriptNode(engine, node, parent);
    default: return undefined; // unrecognized node types are ignored, but their children will still be parsed
  }
}
