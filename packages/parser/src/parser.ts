import type { Engine, Node } from "@webgame/engine";
import type { UnparsedXmlNode } from "./parse-base";
import {
  getAttributes,
  getChildren,
  getType,
  parseXmlText,
} from "./parse-base";
import {
  createBallNode,
  createBoxNode,
  createButtonNode,
  createCameraNode,
  createScriptNode,
  createTubeNode,
} from "./node-helpers";

// loads the game file onto an engine instance.
export function loadGameFile(engine: Engine, text: string): void {
  const gameNode = parseXmlText(text);
  if (getType(gameNode) !== "game") {
    throw new Error(`Invalid XML: root node must be <game>. Found <${getType(gameNode)}> instead.`);
  }
  const children = getChildren(gameNode);
  for (const child of children) {
    loadNodeTree(engine, child, engine.scene);
  }
}

function loadNodeTree(engine: Engine, node: UnparsedXmlNode, parent?: Node): void {
  // recursively loads the tree of nodes
  const currentNode = createSingleNode(engine, node, parent);
  if (currentNode !== undefined && currentNode.parent === null) {
    engine.addNode(currentNode, parent); // add to game engine with a parent
  }
  const children = getChildren(node);
  for (const child of children) {
    // pass through parent if current node is unrecognized and thus not created
    loadNodeTree(engine, child, currentNode ?? parent);
  }
}

function createSingleNode(engine: Engine, node: UnparsedXmlNode, parent?: Node): Node | undefined {
  // creates a game engine node using the context, or none if the node type is unrecognized.
  let currentNode: Node | undefined;

  switch (getType(node)) {
    case "box":
      currentNode = createBoxNode(node);
      break;
    case "tube":
      currentNode = createTubeNode(node);
      break;
    case "ball":
      currentNode = createBallNode(node);
      break;
    case "camera":
      currentNode = createCameraNode(node);
      break;
    case "button":
      currentNode = createButtonNode(node);
      break;
    case "script":
      if (parent === undefined) {
        throw new Error("Script nodes require a parent.");
      }

      currentNode = createScriptNode(node, parent);
      break;
    default:
      return undefined; // unrecognized node types are ignored, but their children will still be parsed
  }

  if (currentNode !== undefined) {
    const attributes = getAttributes(node);
    const id = attributes.id;

    if (typeof id === "string") {
      currentNode.id = id;
    }
  }

  return currentNode;
}
