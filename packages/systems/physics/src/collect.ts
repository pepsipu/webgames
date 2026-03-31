import {
  collectNamedElements,
  type Element,
  walkElements,
} from "@webgames/engine";
import { ShapeElement } from "@webgames/game";
import { SphericalJointElement } from "./joint";
import { getShapePhysicsBody } from "./shape";

export interface PhysicsScene {
  bodies: Set<ShapeElement>;
  namedBodies: Map<string, ShapeElement>;
  joints: Set<SphericalJointElement>;
}

export function collectPhysicsScene(root: Element): PhysicsScene {
  const namedBodies = new Map<string, ShapeElement>();

  for (const [name, element] of collectNamedElements(root)) {
    if (
      element instanceof ShapeElement &&
      getShapePhysicsBody(element) !== "none"
    ) {
      namedBodies.set(name, element);
    }
  }

  const scene: PhysicsScene = {
    bodies: new Set(),
    namedBodies,
    joints: new Set(),
  };

  for (const element of walkElements(root)) {
    if (
      element instanceof ShapeElement &&
      getShapePhysicsBody(element) !== "none"
    ) {
      scene.bodies.add(element);
    }

    if (element instanceof SphericalJointElement) {
      scene.joints.add(element);
    }
  }

  return scene;
}
