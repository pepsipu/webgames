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

export type PhysicsBodyType = "none" | "fixed" | "dynamic";

export interface ShapePhysicsController {
  applyForce(x: number, y: number, z: number): void;
  applyForceAtPoint(
    forceX: number,
    forceY: number,
    forceZ: number,
    pointX: number,
    pointY: number,
    pointZ: number,
  ): void;
  applyImpulse(x: number, y: number, z: number): void;
  applyImpulseAtPoint(
    impulseX: number,
    impulseY: number,
    impulseZ: number,
    pointX: number,
    pointY: number,
    pointZ: number,
  ): void;
}

interface ShapeOptionsBase {
  transform: Transform;
  color: Material;
  body: PhysicsBodyType;
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

interface BoxGeometry {
  kind: "box";
  width: number;
  height: number;
  depth: number;
}

interface TubeGeometry {
  kind: "tube";
  radius: number;
  height: number;
  segments: number;
}

interface BallGeometry {
  kind: "ball";
  radius: number;
  segments: number;
  rings: number;
}

export type ShapeGeometry = BoxGeometry | TubeGeometry | BallGeometry;

export class ShapeElement extends TransformElement {
  geometry: ShapeGeometry;
  material: Material;
  body: PhysicsBodyType;
  #mesh: Mesh | null;
  #meshKey: string | null;
  #physicsController: ShapePhysicsController;

  static createBox(options: BoxOptions): ShapeElement {
    return new ShapeElement(
      options.transform,
      {
        kind: "box",
        width: options.width,
        height: options.height,
        depth: options.depth,
      },
      options.color,
      options.body,
    );
  }

  static createTube(options: TubeOptions): ShapeElement {
    return new ShapeElement(
      options.transform,
      {
        kind: "tube",
        radius: options.radius,
        height: options.height,
        segments: options.segments,
      },
      options.color,
      options.body,
    );
  }

  static createBall(options: BallOptions): ShapeElement {
    return new ShapeElement(
      options.transform,
      {
        kind: "ball",
        radius: options.radius,
        segments: options.segments,
        rings: options.rings,
      },
      options.color,
      options.body,
    );
  }

  constructor(
    transform: Transform,
    geometry: ShapeGeometry,
    material: Material,
    body: PhysicsBodyType,
  ) {
    super(transform);
    this.geometry = cloneShapeGeometry(geometry);
    this.material = cloneMaterial(material);
    this.body = body;
    this.#mesh = null;
    this.#meshKey = null;
    this.#physicsController = missingShapePhysicsController;
  }

  get mesh(): Mesh {
    const meshKey = getShapeGeometryKey(this.geometry);

    if (this.#mesh !== null && this.#meshKey === meshKey) {
      return this.#mesh;
    }

    const mesh = createShapeMesh(this.geometry);

    this.#mesh = mesh;
    this.#meshKey = meshKey;
    return mesh;
  }

  @script()
  setColor(r: number, g: number, b: number): void {
    this.material[0] = r;
    this.material[1] = g;
    this.material[2] = b;
  }

  @script()
  applyForce(x: number, y: number, z: number): void {
    this.#physicsController.applyForce(x, y, z);
  }

  @script()
  applyForceAtPoint(
    forceX: number,
    forceY: number,
    forceZ: number,
    pointX: number,
    pointY: number,
    pointZ: number,
  ): void {
    this.#physicsController.applyForceAtPoint(
      forceX,
      forceY,
      forceZ,
      pointX,
      pointY,
      pointZ,
    );
  }

  @script()
  applyImpulse(x: number, y: number, z: number): void {
    this.#physicsController.applyImpulse(x, y, z);
  }

  @script()
  applyImpulseAtPoint(
    impulseX: number,
    impulseY: number,
    impulseZ: number,
    pointX: number,
    pointY: number,
    pointZ: number,
  ): void {
    this.#physicsController.applyImpulseAtPoint(
      impulseX,
      impulseY,
      impulseZ,
      pointX,
      pointY,
      pointZ,
    );
  }

  setPhysicsController(controller: ShapePhysicsController): void {
    this.#physicsController = controller;
  }

  clearPhysicsController(): void {
    this.#physicsController = missingShapePhysicsController;
  }
}

export function getShapeGeometryKey(geometry: ShapeGeometry): string {
  switch (geometry.kind) {
    case "box":
      return `box:${geometry.width}:${geometry.height}:${geometry.depth}`;
    case "tube":
      return `tube:${geometry.radius}:${geometry.height}:${geometry.segments}`;
    case "ball":
      return `ball:${geometry.radius}:${geometry.segments}:${geometry.rings}`;
  }
}

function cloneShapeGeometry(geometry: ShapeGeometry): ShapeGeometry {
  switch (geometry.kind) {
    case "box":
      return { ...geometry };
    case "tube":
      return { ...geometry };
    case "ball":
      return { ...geometry };
  }
}

function createShapeMesh(geometry: ShapeGeometry): Mesh {
  switch (geometry.kind) {
    case "box":
      return createBoxMesh(geometry.width, geometry.height, geometry.depth);
    case "tube":
      return createTubeMesh(
        geometry.radius,
        geometry.height,
        geometry.segments,
      );
    case "ball":
      return createBallMesh(geometry.radius, geometry.segments, geometry.rings);
  }
}

const missingShapePhysicsController: ShapePhysicsController = {
  applyForce() {
    throw new Error("Shape does not have a physics body.");
  },
  applyForceAtPoint() {
    throw new Error("Shape does not have a physics body.");
  },
  applyImpulse() {
    throw new Error("Shape does not have a physics body.");
  },
  applyImpulseAtPoint() {
    throw new Error("Shape does not have a physics body.");
  },
};
