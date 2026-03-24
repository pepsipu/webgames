import { script } from "@webgames/engine";
import {
  createBallMesh,
  createBoxMesh,
  createTubeMesh,
  type Mesh,
} from "./mesh";
import { cloneMaterial, type Material } from "./material";
import { Transform, TransformElement } from "./transform";
import { Vector3 } from "../math/vector3";

export interface ShapeOptionsBase {
  transform: Transform;
  color: Material;
}

export interface BoxOptions extends ShapeOptionsBase {
  width: number;
  height: number;
  depth: number;
}

export interface TubeOptions extends ShapeOptionsBase {
  radius: number;
  height: number;
  segments: number;
}

export interface BallOptions extends ShapeOptionsBase {
  radius: number;
  segments: number;
  rings: number;
}

export class ShapeElement extends TransformElement {
  mesh: Mesh;
  material: Material;

  constructor(transform: Transform, mesh: Mesh, material: Material) {
    super(transform);
    this.mesh = mesh;
    this.material = cloneMaterial(material);
  }

  @script()
  setColor(r: number, g: number, b: number): void {
    this.material[0] = r;
    this.material[1] = g;
    this.material[2] = b;
  }
}

function createShape(options: ShapeOptionsBase, mesh: Mesh): ShapeElement {
  return new ShapeElement(options.transform, mesh, options.color);
}

export function createBox(options: BoxOptions): ShapeElement {
  return createShape(
    options,
    createBoxMesh(options.width, options.height, options.depth),
  );
}

export function createTube(options: TubeOptions): ShapeElement {
  return createShape(
    options,
    createTubeMesh(options.radius, options.height, options.segments),
  );
}

export function createBall(options: BallOptions): ShapeElement {
  return createShape(
    options,
    createBallMesh(options.radius, options.segments, options.rings),
  );
}
