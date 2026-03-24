import {
  Transform,
  Vector3,
  createBall,
  createBox,
  createCamera,
  createTube,
} from "@webgames/game";
import type { Element } from "@webgames/engine";
import { ScriptElement } from "@webgames/script";
import { createButton, createParagraph } from "@webgames/ui";
import type { Attributes, UnparsedXmlNode } from "./parse-base";
import type {
  BallOptions,
  BoxOptions,
  CreateCameraOptions,
  Material,
  TubeOptions,
} from "@webgames/game";
import { getAttributes, getText } from "./parse-base";
import { parseNumber, parseVector3 } from "./utils";

// helper functions for handling game engine element creation from XML data
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

export function createBoxElement(
  boxNode: UnparsedXmlNode,
): Element | undefined {
  const attributes = getAttributes(boxNode);
  const options: BoxOptions = {
    transform: parseTransform(attributes),
    width: parseNumberOrDefault(attributes, "width", 1),
    height: parseNumberOrDefault(attributes, "height", 1),
    depth: parseNumberOrDefault(attributes, "depth", 1),
    color: parseColor(attributes),
  };

  return createBox(options);
}

export function createTubeElement(
  tubeNode: UnparsedXmlNode,
): Element | undefined {
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

export function createBallElement(
  ballNode: UnparsedXmlNode,
): Element | undefined {
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

export function createCameraElement(
  cameraNode: UnparsedXmlNode,
): Element | undefined {
  const attributes = getAttributes(cameraNode);
  const options: CreateCameraOptions = {
    transform: parseTransform(attributes),
    fovY: parseNumberOrDefault(attributes, "fovY", Math.PI / 3),
    near: parseNumberOrDefault(attributes, "near", 0.1),
    far: parseNumberOrDefault(attributes, "far", 100),
  };

  return createCamera(options);
}

export function createButtonElement(buttonNode: UnparsedXmlNode): Element {
  return createButton(getText(buttonNode) ?? "");
}

export function createParagraphElement(
  paragraphNode: UnparsedXmlNode,
): Element {
  return createParagraph(getText(paragraphNode) ?? "");
}

export function createScriptElement(
  scriptNode: UnparsedXmlNode,
): Element | undefined {
  const source = getText(scriptNode);
  if (source === undefined) {
    return undefined;
  }

  return new ScriptElement(source, defaultScriptTickBudgetMs);
}
