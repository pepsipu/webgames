import type { Engine } from "@webgames/engine";
import { ShapeElement, Transform } from "@webgames/game";
import { collectPhysicsScene } from "./collect";
import {
  createColliderDesc,
  createRigidBodyDesc,
  createSphericalJointData,
  syncRigidBodyFromTransform,
  syncTransformPoseFromRigidBody,
} from "./interop";
import { SphericalJointElement } from "./joint";
import type { ImpulseJoint, Rapier, RigidBody } from "./rapier";
import {
  clearShapeRigidBody,
  getShapePhysicsBody,
  setShapeRigidBody,
} from "./shape";

const defaultGravity = { x: 0, y: -9.81, z: 0 };

type World = import("@dimforge/rapier3d-compat").World;

export class PhysicsRuntime {
  readonly #bodies = new Map<ShapeElement, RigidBody>();
  readonly #joints = new Map<SphericalJointElement, ImpulseJoint>();
  readonly #rapier: Rapier;
  readonly #world: World;
  readonly #worldTransform = Transform.create();

  constructor(rapier: Rapier) {
    this.#rapier = rapier;
    this.#world = new rapier.World(defaultGravity);
  }

  tick(engine: Engine, deltaTime: number): void {
    const scene = collectPhysicsScene(engine.document);

    this.syncBodies(scene.bodies);
    this.syncJoints(scene.namedBodies, scene.joints);
    this.syncFixedBodiesFromTransforms();
    this.#world.timestep = deltaTime;
    this.#world.step();
    this.syncTransformsFromBodies();
  }

  destroy(): void {
    for (const element of this.#bodies.keys()) {
      clearShapeRigidBody(element);
    }

    this.#joints.clear();
    this.#bodies.clear();
    this.#world.free();
  }

  private syncBodies(activeBodies: ReadonlySet<ShapeElement>): void {
    for (const element of activeBodies) {
      if (this.#bodies.has(element)) {
        continue;
      }

      Transform.getWorld(this.#worldTransform, element);
      const body = this.#world.createRigidBody(
        createRigidBodyDesc(
          this.#rapier,
          getShapePhysicsBody(element),
          this.#worldTransform,
        ),
      );

      this.#world.createCollider(
        createColliderDesc(this.#rapier, element, this.#worldTransform.scale),
        body,
      );
      setShapeRigidBody(element, body);
      this.#bodies.set(element, body);
    }

    for (const [element, body] of this.#bodies) {
      if (activeBodies.has(element)) {
        continue;
      }

      clearShapeRigidBody(element);
      this.#world.removeRigidBody(body);
      this.#bodies.delete(element);
    }
  }

  private syncJoints(
    namedBodies: ReadonlyMap<string, ShapeElement>,
    activeJoints: ReadonlySet<SphericalJointElement>,
  ): void {
    for (const [jointElement, joint] of this.#joints) {
      if (activeJoints.has(jointElement)) {
        continue;
      }

      this.removeJoint(joint);
      this.#joints.delete(jointElement);
    }

    for (const jointElement of activeJoints) {
      const existingJoint = this.#joints.get(jointElement);

      if (existingJoint !== undefined) {
        if (existingJoint.isValid()) {
          continue;
        }

        this.#joints.delete(jointElement);
      }

      const body1Element = namedBodies.get(jointElement.body1);
      if (body1Element === undefined) {
        throw new Error(`Missing joint body "${jointElement.body1}".`);
      }

      const body2Element = namedBodies.get(jointElement.body2);
      if (body2Element === undefined) {
        throw new Error(`Missing joint body "${jointElement.body2}".`);
      }

      const body1 = this.#bodies.get(body1Element);
      if (body1 === undefined) {
        throw new Error(`Missing rigid body for "${jointElement.body1}".`);
      }

      const body2 = this.#bodies.get(body2Element);
      if (body2 === undefined) {
        throw new Error(`Missing rigid body for "${jointElement.body2}".`);
      }

      const joint = this.#world.createImpulseJoint(
        createSphericalJointData(this.#rapier, jointElement),
        body1,
        body2,
        true,
      );

      joint.setContactsEnabled(false);
      this.#joints.set(jointElement, joint);
    }
  }

  private syncFixedBodiesFromTransforms(): void {
    for (const [element, body] of this.#bodies) {
      if (body.isDynamic()) {
        continue;
      }

      Transform.getWorld(this.#worldTransform, element);
      syncRigidBodyFromTransform(body, this.#worldTransform);
    }
  }

  private syncTransformsFromBodies(): void {
    for (const [element, body] of this.#bodies) {
      if (body.isFixed()) {
        continue;
      }

      Transform.getWorld(this.#worldTransform, element);
      syncTransformPoseFromRigidBody(this.#worldTransform, body);
      Transform.setWorld(element, this.#worldTransform);
    }
  }

  private removeJoint(joint: ImpulseJoint): void {
    if (!joint.isValid()) {
      return;
    }

    this.#world.removeImpulseJoint(joint, true);
  }
}
