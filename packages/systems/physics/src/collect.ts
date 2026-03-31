import { type Element, selectElements } from "@webgames/engine";
import { ShapeElement } from "@webgames/game";
import { SphericalJointElement } from "./joint";
import { getShapePhysicsBody } from "./shape";

export interface PhysicsScene {
  bodies: Set<ShapeElement>;
  bodiesById: Map<string, ShapeElement>;
  joints: Set<SphericalJointElement>;
}

export function collectPhysicsScene(root: Element): PhysicsScene {
  const bodies = new Set(
    selectElements(root, (element): element is ShapeElement => {
      return (
        element instanceof ShapeElement &&
        getShapePhysicsBody(element) !== "none"
      );
    }),
  );
  const bodiesById = new Map<string, ShapeElement>();

  for (const element of bodies) {
    const id = element.id;

    if (id === null) {
      continue;
    }

    if (bodiesById.has(id)) {
      throw new Error(`Duplicate physics body id "${id}".`);
    }

    bodiesById.set(id, element);
  }

  const scene: PhysicsScene = {
    bodies,
    bodiesById,
    joints: new Set(
      selectElements(root, (element): element is SphericalJointElement => {
        return element instanceof SphericalJointElement;
      }),
    ),
  };

  return scene;
}
