import type { ElementFields } from "@webgames/engine";
import type { Mesh } from "./mesh";
import type { Material } from "./material";
import { TransformElement, vector3Field } from "./transform";
import { Vector3 } from "../math/vector3";

// TODO: move physics into physics system
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

export abstract class ShapeElement extends TransformElement {
  static readonly scriptMethods: readonly string[] = [
    "setColor",
    "applyForce",
    "applyForceAtPoint",
    "applyImpulse",
    "applyImpulseAtPoint",
  ];
  static readonly fields: ElementFields<any> = {
    color: vector3Field<ShapeElement>("color", (element) => element.material),
    body: {
      set(element, value) {
        element.body = requireBodyType(value);
      },
    },
  } satisfies ElementFields<ShapeElement>;

  material: Material;
  body: PhysicsBodyType;
  #mesh: Mesh | null;
  #meshKey: string | null;
  #physicsController: ShapePhysicsController;

  constructor() {
    super();
    this.material = Vector3.create(1, 1, 1);
    this.body = "none";
    this.#mesh = null;
    this.#meshKey = null;
    this.#physicsController = missingShapePhysicsController;
  }

  get mesh(): Mesh {
    const meshKey = this.getMeshKey();

    if (this.#mesh !== null && this.#meshKey === meshKey) {
      return this.#mesh;
    }

    const mesh = this.createMesh();

    this.#mesh = mesh;
    this.#meshKey = meshKey;
    return mesh;
  }

  setColor(r: number, g: number, b: number): void {
    this.material[0] = r;
    this.material[1] = g;
    this.material[2] = b;
  }

  applyForce(x: number, y: number, z: number): void {
    this.#physicsController.applyForce(x, y, z);
  }

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

  applyImpulse(x: number, y: number, z: number): void {
    this.#physicsController.applyImpulse(x, y, z);
  }

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

  protected abstract createMesh(): Mesh;

  protected abstract getMeshKey(): string;
}

function requireBodyType(value: unknown): PhysicsBodyType {
  switch (value) {
    case "none":
    case "fixed":
    case "dynamic":
      return value;
    default:
      throw new Error('Field "body" must be "none", "fixed", or "dynamic".');
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
