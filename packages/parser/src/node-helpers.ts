import {
  Engine,
  Transform,
  Vector3,
  createBall,
  createBox,
  createTube,
  createScript,
} from "@webgame/engine";
import type {
  Attributes,
  UnparsedXmlNode,
} from "./parse-base";
import type {
  BallOptions,
  BoxOptions,
  Material,
  Node,
  TubeOptions,
} from "@webgame/engine";
import { getAttributes, getText } from "./parse-base";
import { parseNumber, parseVector3 } from "./utils";

// helper functions for handling game engine node creation from XML data
const defaultScriptTickBudgetMs = 250;

function parseTransform(attributes: Attributes): Transform {
  if (!("position" in attributes)) {
    return Transform.create();
  }

  return Transform.create(parseVector3(attributes.position));
}

function parseColor(attributes: Attributes): Material {
  if (!("color" in attributes)) {
    return Vector3.create(1, 1, 1);
  }

  return parseVector3(attributes.color);
}

function parseRequiredNumber(
  attributes: Attributes,
  name: string,
  nodeType: string,
): number {
  if (!(name in attributes)) {
    throw new Error(`Invalid <${nodeType}>: missing "${name}" attribute.`);
  }

  return parseNumber(attributes[name]);
}

function parseNumberOrDefault(
  attributes: Attributes,
  name: string,
  fallback: number,
): number {
  if (!(name in attributes)) {
    return fallback;
  }

  return parseNumber(attributes[name]);
}

export function createBoxNode(boxNode: UnparsedXmlNode): Node | undefined {
  const attributes = getAttributes(boxNode);
  const options: BoxOptions = {
    transform: parseTransform(attributes),
    width: parseRequiredNumber(attributes, "width", "box"),
    height: parseRequiredNumber(attributes, "height", "box"),
    depth: parseRequiredNumber(attributes, "depth", "box"),
    color: parseColor(attributes),
  };

  return createBox(options);
}

export function createTubeNode(tubeNode: UnparsedXmlNode): Node | undefined {
  const attributes = getAttributes(tubeNode);
  const options: TubeOptions = {
    transform: parseTransform(attributes),
    radius: parseRequiredNumber(attributes, "radius", "tube"),
    height: parseRequiredNumber(attributes, "height", "tube"),
    segments: parseNumberOrDefault(attributes, "segments", 24),
    color: parseColor(attributes),
  };

  return createTube(options);
}

export function createBallNode(ballNode: UnparsedXmlNode): Node | undefined {
  const attributes = getAttributes(ballNode);
  const options: BallOptions = {
    transform: parseTransform(attributes),
    radius: parseRequiredNumber(attributes, "radius", "ball"),
    segments: parseNumberOrDefault(attributes, "segments", 20),
    rings: parseNumberOrDefault(attributes, "rings", 14),
    color: parseColor(attributes),
  };

  return createBall(options);
}

export function createButtonNode(boxNode: UnparsedXmlNode): Node | undefined {
  // placeholder example function for creating a button node
  // game engine does not have these features yet
  return undefined;
}

export function createScriptNode(engine: Engine, scriptNode: UnparsedXmlNode, parent: Node): Node | undefined {
  const source = getText(scriptNode);
  const isLocal = "local" in getAttributes(scriptNode);
  if (source === undefined) {
    return undefined; // if there's no source, don't create a script node
  }

  // for now, isLocal is unused
  return createScript({
    parent,
    service: engine.scriptService,
    source,
    tickBudgetMs: defaultScriptTickBudgetMs,
  });
}
