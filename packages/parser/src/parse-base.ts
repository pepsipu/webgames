import { XMLParser } from "fast-xml-parser";

// helper types
export type Attributes = Partial<Record<string, string | boolean>>;
export type UnparsedXmlNode = Record<string, unknown>;

// inner parser setup
const attributesGroupName = "@_attributes";
const attributeNamePrefix = "@_";
const textNodeKey = "#text";

const parserOptions = {
  stopNodes: ["*.script"],
  ignoreAttributes: false,
  attributeNamePrefix: attributeNamePrefix,
  attributesGroupName: attributesGroupName,
  textNodeName: textNodeKey,
  alwaysCreateTextNode: true,
  allowBooleanAttributes: true,
  trimValues: true,
  parseAttributeValue: false,
  preserveOrder: false,
};

const xmlParser = new XMLParser(parserOptions);

export function parseXmlText(text: string): UnparsedXmlNode {
  return xmlParser.parse(text) as UnparsedXmlNode;
}

export function getText(node: UnparsedXmlNode): string {
  const textValue = node[textNodeKey];
  if (typeof textValue === "string") {
    return textValue;
  }
  return "";
}

export function getAttributes(node: UnparsedXmlNode): Attributes {
  const rawAttributes = node[attributesGroupName] as Attributes | undefined;
  if (rawAttributes) {
    // remove prefix from attribute keys
    const attributes: Attributes = {};
    for (const key in rawAttributes) {
      if (key.startsWith(attributeNamePrefix)) {
        const attributeKey = key.slice(attributeNamePrefix.length);
        attributes[attributeKey] = rawAttributes[key];
      }
    }
    return attributes;
  }
  return {} as Attributes;
}

export function toNodeArray(value: UnparsedXmlNode | UnparsedXmlNode[] | unknown): UnparsedXmlNode[] {
  // converts the result of a XML lookup into an array
  // since it can be either a single object or an array of objects
  if (value === undefined || value === null) {
    return [];
  }

  if (isNode(value)) {
    return [value];
  }

  if (Array.isArray(value)) {
    // filter out non-node values
    const nodes = value.filter(isNode);
    return nodes;
  }

  // unrecognized value type, drop
  return [];
}

export function isNode(value: unknown): value is UnparsedXmlNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
