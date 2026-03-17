import {
  ColliderDesc,
  RigidBodyDesc,
  type RigidBody,
  type Rotation,
  type World,
} from "@dimforge/rapier3d";
import type { NodeWith } from "../component";
import {
  Transform,
  type TransformState,
} from "../transform";
import {
  PhysicsBody,
  type PhysicsCollider,
} from "./body";

export type PhysicsBodyNode = NodeWith<[typeof Transform, typeof PhysicsBody]>;

export interface PhysicsBodyInstance {
  body: RigidBody;
  worldTransform: TransformState;
}

export function createPhysicsBodyInstance(
  world: World,
  node: PhysicsBodyNode,
): PhysicsBodyInstance {
  const worldTransform = Transform.create();

  Transform.getWorld(worldTransform, node);

  const body = world.createRigidBody(
    createRigidBodyDesc(node.physicsBody, worldTransform),
  );
  world.createCollider(
    createColliderDesc(node.physicsBody.collider),
    body,
  );

  return {
    body,
    worldTransform,
  };
}

export function destroyPhysicsBodyInstance(
  world: World,
  instance: PhysicsBodyInstance,
): void {
  world.removeRigidBody(instance.body);
}

export function syncPhysicsBodyInstance(
  node: PhysicsBodyNode,
  instance: PhysicsBodyInstance,
): void {
  Transform.getWorld(instance.worldTransform, node);

  const translation = toRapierVector(instance.worldTransform.position);
  const rotation = toRapierRotation(instance.worldTransform.rotation);

  if (node.physicsBody.type === "kinematic") {
    instance.body.setNextKinematicTranslation(translation);
    instance.body.setNextKinematicRotation(rotation);
    return;
  }

  instance.body.setTranslation(translation, false);
  instance.body.setRotation(rotation, false);
}

export function writePhysicsBodyTransform(
  node: PhysicsBodyNode,
  instance: PhysicsBodyInstance,
): void {
  const translation = instance.body.translation();
  const rotation = instance.body.rotation();
  const worldTransform = instance.worldTransform;

  worldTransform.position[0] = translation.x;
  worldTransform.position[1] = translation.y;
  worldTransform.position[2] = translation.z;
  worldTransform.rotation[0] = rotation.x;
  worldTransform.rotation[1] = rotation.y;
  worldTransform.rotation[2] = rotation.z;
  worldTransform.rotation[3] = rotation.w;

  Transform.setWorld(node, worldTransform);
}

function createRigidBodyDesc(
  physicsBody: PhysicsBody,
  transform: TransformState,
): RigidBodyDesc {
  const desc = createRigidBodyTypeDesc(physicsBody.type);

  desc.setTranslation(
    transform.position[0],
    transform.position[1],
    transform.position[2],
  );
  desc.setRotation(toRapierRotation(transform.rotation));
  desc.setGravityScale(physicsBody.gravityScale);

  return desc;
}

function createRigidBodyTypeDesc(type: PhysicsBody["type"]): RigidBodyDesc {
  if (type === "fixed") {
    return RigidBodyDesc.fixed();
  }

  if (type === "kinematic") {
    return RigidBodyDesc.kinematicPositionBased();
  }

  return RigidBodyDesc.dynamic();
}

function createColliderDesc(collider: PhysicsCollider): ColliderDesc {
  const desc = createColliderShapeDesc(collider);

  if (collider.friction !== undefined) {
    desc.setFriction(collider.friction);
  }

  if (collider.restitution !== undefined) {
    desc.setRestitution(collider.restitution);
  }

  if (collider.density !== undefined) {
    desc.setDensity(collider.density);
  }

  return desc;
}

function createColliderShapeDesc(collider: PhysicsCollider): ColliderDesc {
  if (collider.shape === "ball") {
    return ColliderDesc.ball(collider.radius);
  }

  if (collider.shape === "cuboid") {
    return ColliderDesc.cuboid(
      collider.halfExtents[0],
      collider.halfExtents[1],
      collider.halfExtents[2],
    );
  }

  return ColliderDesc.cylinder(collider.halfHeight, collider.radius);
}

function toRapierVector(vector: TransformState["position"]): { x: number; y: number; z: number } {
  return {
    x: vector[0],
    y: vector[1],
    z: vector[2],
  };
}

function toRapierRotation(rotation: TransformState["rotation"]): Rotation {
  return {
    x: rotation[0],
    y: rotation[1],
    z: rotation[2],
    w: rotation[3],
  };
}
