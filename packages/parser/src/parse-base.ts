import { XMLParser } from "fast-xml-parser";

// inner parser setup
const attributesGroupName = ":@" as const;
const attributeNamePrefix = "@_";
const textNodeKey = "#text" as const;

// helper types
export type Attributes = Record<string, string | boolean>;
type RawAttributes = {[attributesGroupName]: Record<string, string | boolean>};
type TextNode = Record<typeof textNodeKey, string>;
type NodeBody = (UnparsedXmlNode | TextNode)[]; // the children of this node, or a text value if the key is textNodeKey

// represents the raw output of the XML parser.
// instead of exporting this, could consider wrapping it in a class that provides helper methods like getAttributes() and getText()
export interface UnparsedXmlNode {
  [attributesGroupName]?: RawAttributes; // DO NOT USE THIS DIRECTLY; use getAttributes()
  [key: string]: NodeBody | unknown;
}

const parserOptions = {
  stopNodes: ["*.script"],
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: attributeNamePrefix,
  attributesGroupName: attributesGroupName,
  textNodeName: textNodeKey,
  alwaysCreateTextNode: true,
  allowBooleanAttributes: true,
  trimValues: true,
  parseAttributeValue: false,
};

const xmlParser = new XMLParser(parserOptions);

export function parseXmlText(text: string): UnparsedXmlNode {
  // because we preserveOrder, the result is always an array
  const result = xmlParser.parse(text) as UnparsedXmlNode[];
  if (result.length === 0) {
    throw new Error("Invalid XML: no data found.");
  }
  return result[0];
}

export function getAttributes(node: UnparsedXmlNode): Attributes {
  const rawAttributes = node[attributesGroupName];
  console.log(`Getting attributes from node. Raw attributes: ${JSON.stringify(rawAttributes)}`);
  if (!rawAttributes) {
    return {};
  }

  // remove prefix from attribute keys
  const rawAttributesGroup = rawAttributes[attributesGroupName];
  const attributes: Attributes = {};
  for (const key of Object.keys(rawAttributesGroup)) {
    console.log(`Processing attribute key: ${key}`);
    if (key.startsWith(attributeNamePrefix)) {
      const attributeKey = key.slice(attributeNamePrefix.length);
      attributes[attributeKey] = rawAttributesGroup[key];
    }
  }
  return attributes;
}

export function getType(node: UnparsedXmlNode): string {
  // the type of a node is determined by its keys, excluding the attributes
  const keys = Object.keys(node).filter(key => key !== attributesGroupName);
  if (keys.length === 0) {
    throw new Error(`Invalid XML node: no type found. Node: ${JSON.stringify(node)}`);
  }
  if (keys.length > 1) {
    throw new Error(`Invalid XML node: multiple keys found: ${keys.join(", ")}. Node: ${JSON.stringify(node)}`);
  }
  return keys[0];
}

function getBody(node: UnparsedXmlNode): NodeBody {
  const type = getType(node);
  return node[type] as NodeBody;
}

export function getChildren(node: UnparsedXmlNode): UnparsedXmlNode[] {
  // filters the children of a node to only include nodes (not text nodes)
  const body = getBody(node);
  return body.filter(child => !(textNodeKey in child)) as UnparsedXmlNode[];
}

export function getText(node: UnparsedXmlNode): string | undefined {
  // gets the text content of a node, if it exists
  const body = getBody(node);
  const textNode = body.find(child => textNodeKey in child) as TextNode | undefined;
  return textNode ? textNode[textNodeKey] : undefined;
}
