import { XMLParser } from "fast-xml-parser";

export type Primitive = string | number | boolean;
export type Attributes = Record<string, Primitive>;
type UnparsedXmlNode = Record<string, unknown>;

export interface SceneObject {
  type: "box" | "tube" | "ball";
  attributes: Attributes;
}

export interface SceneDefinition {
  attributes: Attributes;
  objects: SceneObject[];
}

export interface UiElement {
  type: string;
  attributes: Attributes;
  text?: string;
}

export interface UiDefinition {
  attributes: Attributes;
  elements: UiElement[];
}

export interface ScriptDefinition {
  attributes: Attributes;
  code: string;
  local: boolean;
}

export interface GameFile {
  info: Attributes;
  scenes: SceneDefinition[];
  ui: UiDefinition[];
  scripts: ScriptDefinition[];
}

const supportedSceneObjectTypes = new Set(["box", "tube", "ball"]);
const attributePrefix = "@_";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: attributePrefix,
  allowBooleanAttributes: true,
  trimValues: true,
  parseAttributeValue: false,
  preserveOrder: false,
});

export function parseGameFile(text: string): GameFile {
  const parsed = xmlParser.parse(text) as UnparsedXmlNode;
  const games = toArray(parsed.game)
    .map((node) => toObject(node))
    .filter((node): node is UnparsedXmlNode => node !== null);

  if (games.length === 0) {
    throw new Error("Invalid gamefile: missing <game> root element.");
  }

  // only parse the first game block
  return parseGameNode(games[0]);
}

export function parseGameFiles(text: string): GameFile[] {
  const parsed = xmlParser.parse(text) as UnparsedXmlNode;
  const games = toArray(parsed.game)
    .map((node) => toObject(node))
    .filter((node): node is UnparsedXmlNode => node !== null);

  if (games.length === 0) {
    throw new Error("Invalid gamefile: missing <game> root element.");
  }

  return games.map((game) => parseGameNode(game));
}

function parseGameNode(game: UnparsedXmlNode): GameFile {

  const scenes = toArray(game.scene)
    .map((node) => normalizeContainerNode(node))
    .filter((node): node is UnparsedXmlNode => node !== null)
    .map((node) => parseScene(node));

  const ui = toArray(game.ui)
    .map((node) => normalizeContainerNode(node))
    .filter((node): node is UnparsedXmlNode => node !== null)
    .map((node) => parseUi(node));

  const scripts = toArray(game.script)
    .map((node) => normalizeScriptNode(node))
    .filter((node): node is UnparsedXmlNode => node !== null)
    .map((node) => parseScript(node))
    .filter((script): script is ScriptDefinition => script !== null);

  return {
    info: parseAttributes(game),
    scenes,
    ui,
    scripts,
  };
}

function parseScene(node: UnparsedXmlNode): SceneDefinition {

  const objects: SceneObject[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (!supportedSceneObjectTypes.has(key)) {
      continue;
    }

    for (const rawObject of toArray(value)) {
      const objectNode = toObject(rawObject) ?? {};

      objects.push({
        type: key as SceneObject["type"],
        attributes: parseAttributes(objectNode),
      });
    }
  }

  return {
    attributes: parseAttributes(node),
    objects,
  };
}

function parseUi(node: UnparsedXmlNode): UiDefinition {

  const elements: UiElement[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (key === "#text" || key.startsWith(attributePrefix)) {
      continue;
    }

    for (const rawElement of toArray(value)) {
      const elementNode = toObject(rawElement) ?? {};

      const text = typeof elementNode["#text"] === "string"
        ? elementNode["#text"].trim()
        : undefined;

      elements.push({
        type: key,
        attributes: parseAttributes(elementNode),
        text: text && text.length > 0 ? text : undefined,
      });
    }
  }

  return {
    attributes: parseAttributes(node),
    elements,
  };
}

function parseScript(objectNode: UnparsedXmlNode): ScriptDefinition | null {
  if (!objectNode) {
    return null;
  }

  const rawCode = typeof objectNode["#text"] === "string"
    ? objectNode["#text"]
    : "";

  return {
    attributes: parseAttributes(objectNode),
    code: rawCode.trim(),
    local: Boolean(objectNode[`${attributePrefix}local`]),
  };
}

function normalizeScriptNode(node: unknown): UnparsedXmlNode | null {
  if (typeof node === "string") {
    return {
      "#text": node,
    };
  }

  return toObject(node);
}

function normalizeContainerNode(node: unknown): UnparsedXmlNode | null {
  if (typeof node === "string") {
    return {};
  }

  return toObject(node);
}

function parseAttributes(node: UnparsedXmlNode): Attributes {
  const attributes: Attributes = {};

  for (const [key, value] of Object.entries(node)) {
    if (!key.startsWith(attributePrefix)) {
      continue;
    }

    if (isPrimitiveValue(value)) {
      const attributeName = key.slice(attributePrefix.length);
      attributes[attributeName] = normalizePrimitive(value);
    }
  }

  return attributes;
}

function normalizePrimitive(value: Primitive): Primitive {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === "true") {
      return true;
    }

    if (trimmed === "false") {
      return false;
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }

    return trimmed;
  }

  return value;
}

function toArray(value: unknown): unknown[] {
  // converts the result of a XML lookup into an array
  // since it can be either a single object or an array of objects
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toObject(value: unknown): UnparsedXmlNode | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as UnparsedXmlNode;
}

function isPrimitiveValue(value: unknown): value is Primitive {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}