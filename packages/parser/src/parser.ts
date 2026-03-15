import type { Engine, Node, Vector3 } from "@webgame/engine";
import type { UnparsedXmlNode } from "./parse-base";
import { parseXmlText, getChildren, getType } from "./parse-base";
import { createBoxNode, createTubeNode, createBallNode, createButtonNode, createScriptNode } from "./node-helpers";

// loads the game file onto an engine instance.
export async function loadGameFile(engine: Engine, text: string): Promise<void> {
  const gameNode = parseXmlText(text);
  if (getType(gameNode) !== "game") {
    throw new Error(`Invalid XML: root node must be <game>. Found <${getType(gameNode)}> instead.`);
  }
  await loadNodeTree(engine, gameNode);
}

async function loadNodeTree(engine: Engine, node: UnparsedXmlNode, parent?: Node): Promise<void> {
  // recursively loads the tree of nodes
  const currentNode = await loadSingleNode(engine, node, parent);
  const children = getChildren(node);
  for (const child of children) {
    await loadNodeTree(engine, child, currentNode);
  }
}

async function loadSingleNode(engine: Engine, node: UnparsedXmlNode, parent?: Node): Promise<Node | undefined> {
  // creates a game engine node using the context, or none if the node type is unrecognized.
  console.log(`Loading node of type ${getType(node)} with a parent ${parent ? "exists" : "none"}`);
  switch (getType(node)) {
    case "scene": return engine.scene; // the scene node corresponds to the root of the scene graph in the game engine
    case "ui": return undefined; // (game engine doesn't have ui system yet)
    case "box": return createBoxNode(engine, node, parent);
    case "tube": return createTubeNode(engine, node, parent);
    case "ball": return createBallNode(engine, node, parent);
    case "button": return createButtonNode(engine, node, parent);
    case "script": return await createScriptNode(engine, node, parent);
    default: return undefined; // unrecognized node types are ignored, but their children will still be parsed
  }
}
