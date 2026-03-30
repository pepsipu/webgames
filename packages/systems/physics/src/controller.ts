import {
  ShapeElement,
  Transform,
  Vector3,
  type ShapePhysicsController,
} from "@webgames/game";
import type { RigidBody } from "./rapier";

export class RapierShapePhysicsController implements ShapePhysicsController {
  readonly #body: RigidBody;
  readonly #element: ShapeElement;
  readonly #worldTransform: Transform;
  readonly #worldPoint: Vector3;

  constructor(element: ShapeElement, body: RigidBody) {
    this.#body = body;
    this.#element = element;
    this.#worldTransform = Transform.create();
    this.#worldPoint = Vector3.create();
  }

  applyForce(x: number, y: number, z: number): void {
    this.#body.addForce(createRapierVector(x, y, z), true);
  }

  applyForceAtPoint(
    forceX: number,
    forceY: number,
    forceZ: number,
    pointX: number,
    pointY: number,
    pointZ: number,
  ): void {
    this.transformPoint(pointX, pointY, pointZ);
    this.#body.addForceAtPoint(
      createRapierVector(forceX, forceY, forceZ),
      createRapierVector(
        this.#worldPoint[0],
        this.#worldPoint[1],
        this.#worldPoint[2],
      ),
      true,
    );
  }

  applyImpulse(x: number, y: number, z: number): void {
    this.#body.applyImpulse(createRapierVector(x, y, z), true);
  }

  applyImpulseAtPoint(
    impulseX: number,
    impulseY: number,
    impulseZ: number,
    pointX: number,
    pointY: number,
    pointZ: number,
  ): void {
    this.transformPoint(pointX, pointY, pointZ);
    this.#body.applyImpulseAtPoint(
      createRapierVector(impulseX, impulseY, impulseZ),
      createRapierVector(
        this.#worldPoint[0],
        this.#worldPoint[1],
        this.#worldPoint[2],
      ),
      true,
    );
  }

  private transformPoint(x: number, y: number, z: number): void {
    Transform.getWorld(this.#worldTransform, this.#element);
    Vector3.set(this.#worldPoint, x, y, z);
    Transform.transformPoint(
      this.#worldPoint,
      this.#worldTransform,
      this.#worldPoint,
    );
  }
}

function createRapierVector(
  x: number,
  y: number,
  z: number,
): {
  x: number;
  y: number;
  z: number;
} {
  return { x, y, z };
}
