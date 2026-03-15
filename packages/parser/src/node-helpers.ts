import { Engine } from "@webgame/engine";
import type { BallOptions, BoxOptions, Node, TubeOptions } from "@webgame/engine";
import type { UnparsedXmlNode } from "./parse-base";
import { getAttributes, getText } from "./parse-base";
import { parseOptionalNumber, parseOptionalVector3 } from "./utils";

// helper functions for handling game engine node creation from XML data

export function createBoxNode(engine: Engine, boxNode: UnparsedXmlNode, parent?: Node): Node | undefined {
  const attributes = getAttributes(boxNode);
  console.log(`Creating box node with attributes: ${JSON.stringify(attributes)}`);
  const position = parseOptionalVector3(attributes.position);
  const width = parseOptionalNumber(attributes.width);
  const height = parseOptionalNumber(attributes.height);
  const depth = parseOptionalNumber(attributes.depth);
  const color = parseOptionalVector3(attributes.color);

  // scuffed unpacking because currently the options class takes in x, y, z, separately instead of Vector3
  const options = {
    parent,
    ...(position ? { x: position[0], y: position[1], z: position[2] } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(depth !== undefined ? { depth } : {}),
    ...(color ? { color } : {}),
  } as BoxOptions;

  console.log(`Creating box node with options: ${JSON.stringify({parent: !!parent, position, width, height, depth, color})}`);

  // create the box node
  return engine.createBox(options);
}

export function createTubeNode(engine: Engine, tubeNode: UnparsedXmlNode, parent?: Node): Node | undefined {
  const attributes = getAttributes(tubeNode);
  const position = parseOptionalVector3(attributes.position);
  const radius = parseOptionalNumber(attributes.radius);
  const height = parseOptionalNumber(attributes.height);
  const color = parseOptionalVector3(attributes.color);

  const options = {
    parent,
    ...(position ? { x: position[0], y: position[1], z: position[2] } : {}),
    ...(radius !== undefined ? { radius } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(color ? { color } : {}),
  } as TubeOptions;

  // create the tube node
  return engine.createTube(options);
}

export function createBallNode(engine: Engine, ballNode: UnparsedXmlNode, parent?: Node): Node | undefined {
  const attributes = getAttributes(ballNode);
  const position = parseOptionalVector3(attributes.position);
  const radius = parseOptionalNumber(attributes.radius);
  const color = parseOptionalVector3(attributes.color);

  const options = {
    parent,
    ...(position ? { x: position[0], y: position[1], z: position[2] } : {}),
    ...(radius !== undefined ? { radius } : {}),
    ...(color ? { color } : {}),
  } as BallOptions;

  // create the ball node
  return engine.createBall(options);
}

export function createButtonNode(engine: Engine, boxNode: UnparsedXmlNode, parent?: Node): Node | undefined {
  // placeholder example function for creating a button node
  // game engine does not have these features yet
  return undefined;
}

export async function createScriptNode(engine: Engine, scriptNode: UnparsedXmlNode, parent?: Node): Promise<Node | undefined> {
  const source = getText(scriptNode);
  const isLocal = "local" in getAttributes(scriptNode);
  if (source === undefined) {
    return undefined; // if there's no source, don't create a script node
  }
  // for now, treat all (local or not) scripts as the same, load them into the game engine
  return await engine.createScript({source});
}
