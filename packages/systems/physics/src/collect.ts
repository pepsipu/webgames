import { collectNamedElements, type Element } from "@webgames/engine";
import { ShapeElement } from "@webgames/game";
import { SphericalJointElement } from "./joint";

export interface PhysicsScene {
  bodies: Set<ShapeElement>;
  namedBodies: Map<string, ShapeElement>;
  joints: Set<SphericalJointElement>;
}

export function collectPhysicsScene(root: Element): PhysicsScene {
  const namedBodies = new Map<string, ShapeElement>();

  for (const [name, element] of collectNamedElements(root)) {
    if (element instanceof ShapeElement && element.body !== "none") {
      namedBodies.set(name, element);
    }
  }

  const scene: PhysicsScene = {
    bodies: new Set(),
    namedBodies,
    joints: new Set(),
  };

  collectPhysicsChildren(root, scene);
  return scene;
}

function collectPhysicsChildren(parent: Element, scene: PhysicsScene): void {
  for (const child of parent.children) {
    if (child instanceof ShapeElement && child.body !== "none") {
      scene.bodies.add(child);
    }

    if (child instanceof SphericalJointElement) {
      scene.joints.add(child);
    }

    collectPhysicsChildren(child, scene);
  }
}
