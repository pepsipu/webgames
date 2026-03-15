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
  const [x, y, z] = parseVector3((attributes.position ?? "0 0 0").toString());
  const width = parseFloat((attributes.width ?? "1").toString());
  const height = parseFloat((attributes.height ?? "1").toString());
  const depth = parseFloat((attributes.depth ?? "1").toString());
  const color = parseVector3((attributes.color ?? "1 1 1").toString());

  // create the box node
  return engine.createBox({
    parent,
    x,
    y,
    z,
    width,
    height,
    depth,
    color
  });
}

function createTubeNode(engine: Engine, tubeNode: UnparsedXmlNode, parent?: Node): Node {
  const attributes = getAttributes(tubeNode);
  const [x, y, z] = parseVector3((attributes.position ?? "0 0 0").toString());
  const radius = parseFloat((attributes.radius ?? "1").toString());
  const height = parseFloat((attributes.height ?? "1").toString());
  const color = parseVector3((attributes.color ?? "1 1 1").toString());

  // create the tube node
  return engine.createTube({
    parent,
    x,
    y,
    z,
    radius,
    height,
    color
  });
}

function createBallNode(engine: Engine, ballNode: UnparsedXmlNode, parent?: Node): Node {
  const attributes = getAttributes(ballNode);
  const [x, y, z] = parseVector3((attributes.position ?? "0 0 0").toString());
  const radius = parseFloat((attributes.radius ?? "1").toString());
  const color = parseVector3((attributes.color ?? "1 1 1").toString());

  // create the ball node
  return engine.createBall({
    parent,
    x,
    y,
    z,
    radius,
    color
  });
}

function parseVector3(value: string): Vector3 {
  const parts = value.trim().split(/\s+/).map(part => parseFloat(part.trim()));
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid Vector3 value: "${value}"`);
  }
  return [parts[0], parts[1], parts[2]];
}
