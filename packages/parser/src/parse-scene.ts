import { Engine } from "@webgame/engine";
import type { Node, Vector3 } from "@webgame/engine";
import type { UnparsedXmlNode } from "./parse-base";
import { getAttributes, toNodeArray } from "./parse-base";

export function loadSceneNode(engine: Engine, sceneNode: UnparsedXmlNode): void {
  // start recursive algorithm to load the parents
  loadSceneElements(engine, sceneNode);
}

function loadSceneElements(engine: Engine, node: UnparsedXmlNode, parent?: Node): void {
  // load the shapes: box, tube, ball
  const boxes = toNodeArray(node.box);
  const tubes = toNodeArray(node.tube);
  const balls = toNodeArray(node.ball);

  for (const boxNode of boxes) {
    const box = createBoxNode(engine, boxNode, parent);
    // recursively load the children of the box
    loadSceneElements(engine, boxNode, box);
  }
  for (const tubeNode of tubes) {
    const tube = createTubeNode(engine, tubeNode, parent);
    // recursively load the children of the tube
    loadSceneElements(engine, tubeNode, tube);
  }
  for (const ballNode of balls) {
    const ball = createBallNode(engine, ballNode, parent);
    // recursively load the children of the ball
    loadSceneElements(engine, ballNode, ball);
  }
}

// creates the box node, but not any subnodes
function createBoxNode(engine: Engine, boxNode: UnparsedXmlNode, parent?: Node): Node {
  const attributes = getAttributes(boxNode);
  const position = parseOptionalVector3(attributes.position);
  const width = parseOptionalNumber(attributes.width);
  const height = parseOptionalNumber(attributes.height);
  const depth = parseOptionalNumber(attributes.depth);
  const color = parseOptionalVector3(attributes.color);

  const options: Parameters<Engine["createBox"]>[0] = {
    parent,
    ...(position ? { x: position[0], y: position[1], z: position[2] } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(depth !== undefined ? { depth } : {}),
    ...(color ? { color } : {}),
  } as Parameters<Engine["createBox"]>[0];

  // create the box node
  return engine.createBox(options);
}

function createTubeNode(engine: Engine, tubeNode: UnparsedXmlNode, parent?: Node): Node {
  const attributes = getAttributes(tubeNode);
  const position = parseOptionalVector3(attributes.position);
  const radius = parseOptionalNumber(attributes.radius);
  const height = parseOptionalNumber(attributes.height);
  const color = parseOptionalVector3(attributes.color);

  const options: Parameters<Engine["createTube"]>[0] = {
    parent,
    ...(position ? { x: position[0], y: position[1], z: position[2] } : {}),
    ...(radius !== undefined ? { radius } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(color ? { color } : {}),
  } as Parameters<Engine["createTube"]>[0];

  // create the tube node
  return engine.createTube(options);
}

function createBallNode(engine: Engine, ballNode: UnparsedXmlNode, parent?: Node): Node {
  const attributes = getAttributes(ballNode);
  const position = parseOptionalVector3(attributes.position);
  const radius = parseOptionalNumber(attributes.radius);
  const color = parseOptionalVector3(attributes.color);

  const options: Parameters<Engine["createBall"]>[0] = {
    parent,
    ...(position ? { x: position[0], y: position[1], z: position[2] } : {}),
    ...(radius !== undefined ? { radius } : {}),
    ...(color ? { color } : {}),
  } as Parameters<Engine["createBall"]>[0];

  // create the ball node
  return engine.createBall(options);
}

function parseOptionalNumber(value: string | boolean | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value: "${String(value)}"`);
  }

  return parsed;
}

function parseOptionalVector3(value: string | boolean | undefined): Vector3 | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseVector3(String(value));
}

function parseVector3(value: string): Vector3 {
  const parts = value.trim().split(/\s+/).map(part => parseFloat(part.trim()));
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid Vector3 value: "${value}"`);
  }
  return [parts[0], parts[1], parts[2]];
}
