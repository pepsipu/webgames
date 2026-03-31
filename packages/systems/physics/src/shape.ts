import type { ElementField } from "@webgames/engine";
import { ShapeElement, Transform, Vector3 } from "@webgames/game";
import type { RigidBody } from "./rapier";

export type PhysicsBodyType = "none" | "fixed" | "dynamic";

type ShapeElementType = typeof ShapeElement & {
  fields: Record<string, ElementField<ShapeElement>>;
  scriptMethods: string[];
  prototype: ShapeElement & { body: PhysicsBodyType };
};

const activeBodies = new WeakMap<ShapeElement, RigidBody>();
const scratchTransform = Transform.create();
const scratchPoint = Vector3.create();

let installed = false;

// TODO: we should probably extend existing elements in a simpler way
export function installShapePhysics(): void {
  if (installed) {
    return;
  }

  installed = true;

  const type = ShapeElement as ShapeElementType;

  type.fields.body = {
    get: getShapePhysicsBody,
    set(element, value) {
      (element as ShapeElement & { body: PhysicsBodyType }).body =
        requireBodyType(value);
    },
  };
  type.scriptMethods = [
    ...type.scriptMethods,
    "applyForce",
    "applyForceAtPoint",
    "applyImpulse",
    "applyImpulseAtPoint",
  ];
  Object.assign(type.prototype, {
    body: "none" as PhysicsBodyType,
    applyForce(this: ShapeElement, x: number, y: number, z: number): void {
      requireRigidBody(this).addForce({ x, y, z }, true);
    },
    applyForceAtPoint(
      this: ShapeElement,
      forceX: number,
      forceY: number,
      forceZ: number,
      pointX: number,
      pointY: number,
      pointZ: number,
    ): void {
      const point = transformPoint(this, pointX, pointY, pointZ);

      requireRigidBody(this).addForceAtPoint(
        { x: forceX, y: forceY, z: forceZ },
        { x: point[0], y: point[1], z: point[2] },
        true,
      );
    },
    applyImpulse(this: ShapeElement, x: number, y: number, z: number): void {
      requireRigidBody(this).applyImpulse({ x, y, z }, true);
    },
    applyImpulseAtPoint(
      this: ShapeElement,
      impulseX: number,
      impulseY: number,
      impulseZ: number,
      pointX: number,
      pointY: number,
      pointZ: number,
    ): void {
      const point = transformPoint(this, pointX, pointY, pointZ);

      requireRigidBody(this).applyImpulseAtPoint(
        { x: impulseX, y: impulseY, z: impulseZ },
        { x: point[0], y: point[1], z: point[2] },
        true,
      );
    },
  });
}

export function getShapePhysicsBody(element: ShapeElement): PhysicsBodyType {
  return (element as ShapeElement & { body: PhysicsBodyType }).body;
}

export function setShapeRigidBody(
  element: ShapeElement,
  body: RigidBody,
): void {
  activeBodies.set(element, body);
}

export function clearShapeRigidBody(element: ShapeElement): void {
  activeBodies.delete(element);
}

function requireRigidBody(element: ShapeElement): RigidBody {
  const body = activeBodies.get(element);

  if (body !== undefined) {
    return body;
  }

  throw new Error("Shape does not have a physics body.");
}

function transformPoint(
  element: ShapeElement,
  x: number,
  y: number,
  z: number,
): Vector3 {
  Transform.getWorld(scratchTransform, element);
  Vector3.set(scratchPoint, x, y, z);
  Transform.transformPoint(scratchPoint, scratchTransform, scratchPoint);
  return scratchPoint;
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
