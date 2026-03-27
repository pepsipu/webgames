import {
  CameraElement,
  type PhysicsBodyType,
  ShapeElement,
  Transform,
  Vector3,
} from "@webgames/game";
import type { Element } from "@webgames/engine";
import { SphericalJointElement } from "@webgames/physics";
import { ScriptElement } from "@webgames/script";
import { ButtonElement, ParagraphElement } from "@webgames/ui";
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
function parseTransform(attributes: Attributes): Transform {
  const transform = Transform.create();

  if ("position" in attributes) {
    transform.position = parseVector3(attributes.position);
  }

  if ("rotation" in attributes) {
    const [x, y, z] = parseVector3(attributes.rotation);
    Transform.setRotationFromEuler(transform, x, y, z);
  }

  return transform;
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

function parseRequiredString(
  attributes: Attributes,
  name: string,
  nodeType: string,
): string {
  if (!(name in attributes)) {
    throw new Error(`Invalid <${nodeType}>: missing "${name}" attribute.`);
  }

  const value = attributes[name];

  if (typeof value !== "string") {
    throw new Error(`Invalid <${nodeType}>: "${name}" must be a string.`);
  }

  return value;
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

function parseBodyType(
  attributes: Attributes,
  nodeType: string,
): PhysicsBodyType {
  if (!("body" in attributes)) {
    return "none";
  }

  switch (attributes.body) {
    case "none":
    case "fixed":
    case "dynamic":
      return attributes.body;
    default:
      throw new Error(
        `Invalid <${nodeType}>: unknown body type "${attributes.body}".`,
      );
  }
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
    body: parseBodyType(attributes, "box"),
  };

  return ShapeElement.createBox(options);
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
    body: parseBodyType(attributes, "tube"),
  };

  return ShapeElement.createTube(options);
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
    body: parseBodyType(attributes, "ball"),
  };

  return ShapeElement.createBall(options);
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

  return new CameraElement(options);
}

export function createButtonElement(buttonNode: UnparsedXmlNode): Element {
  return new ButtonElement(getText(buttonNode) ?? "");
}

export function createParagraphElement(
  paragraphNode: UnparsedXmlNode,
): Element {
  return new ParagraphElement(getText(paragraphNode) ?? "");
}

export function createScriptElement(
  scriptNode: UnparsedXmlNode,
): Element | undefined {
  const source = getText(scriptNode);
  if (source === undefined) {
    return undefined;
  }

  return new ScriptElement(source);
}

export function createSphericalJointElement(
  jointNode: UnparsedXmlNode,
): Element {
  const attributes = getAttributes(jointNode);

  return new SphericalJointElement(
    parseRequiredString(attributes, "body1", "spherical-joint"),
    parseRequiredString(attributes, "body2", "spherical-joint"),
    parseVector3(parseRequiredString(attributes, "anchor1", "spherical-joint")),
    parseVector3(parseRequiredString(attributes, "anchor2", "spherical-joint")),
  );
}
