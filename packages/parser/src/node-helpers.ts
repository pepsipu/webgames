import { Engine, createBox, createBall, createTube, createScript } from "@webgame/engine";
import type { BallOptions, BoxOptions, Node, ScriptOptions, TubeOptions } from "@webgame/engine";
import type { UnparsedXmlNode } from "./parse-base";
import { getAttributes, getText } from "./parse-base";
import { parseOptionalNumber, parseOptionalVector3 } from "./utils";

// helper functions for handling game engine node creation from XML data

export function createBoxNode(engine: Engine, boxNode: UnparsedXmlNode): Node | undefined {
  const attributes = getAttributes(boxNode);
  const position = parseOptionalVector3(attributes.position);
  const width = parseOptionalNumber(attributes.width);
  const height = parseOptionalNumber(attributes.height);
  const depth = parseOptionalNumber(attributes.depth);
  const color = parseOptionalVector3(attributes.color);

  // scuffed unpacking because currently the options class takes in x, y, z, separately instead of Vector3
  const options = {
    transform: { position },
    width, height, depth,
    color,
  } as BoxOptions;

  // create the box node
  return createBox(options);
}

export function createTubeNode(engine: Engine, tubeNode: UnparsedXmlNode): Node | undefined {
  const attributes = getAttributes(tubeNode);
  const position = parseOptionalVector3(attributes.position);
  const radius = parseOptionalNumber(attributes.radius);
  const height = parseOptionalNumber(attributes.height);
  const color = parseOptionalVector3(attributes.color);

  const options = {
    transform: { position },
    radius,
    height,
    color,
  } as TubeOptions;

  // create the tube node
  return createTube(options);
}

export function createBallNode(engine: Engine, ballNode: UnparsedXmlNode): Node | undefined {
  const attributes = getAttributes(ballNode);
  const position = parseOptionalVector3(attributes.position);
  const radius = parseOptionalNumber(attributes.radius);
  const color = parseOptionalVector3(attributes.color);

  const options = {
    transform: { position },
    radius,
    color,
  } as BallOptions;

  // create the ball node
  return createBall(options);
}

export function createButtonNode(engine: Engine, boxNode: UnparsedXmlNode): Node | undefined {
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

  // for now, isLocal is unused
  const options = {
    parent,
    source,
  } as ScriptOptions;

  return await createScript(options);
}
