import {
  Quaternion,
  Transform,
  Vector3,
  type PhysicsBodyType,
  type ShapeGeometry,
  type Vector3 as Vector3Value,
} from "@webgames/game";
import { SphericalJointElement } from "./joint";
import type { Rapier, RigidBody } from "./rapier";

export function createRigidBodyDesc(
  rapier: Rapier,
  body: PhysicsBodyType,
  transform: Transform,
) {
  const description =
    body === "dynamic"
      ? rapier.RigidBodyDesc.dynamic()
      : rapier.RigidBodyDesc.fixed();

  return description
    .setTranslation(
      transform.position[0],
      transform.position[1],
      transform.position[2],
    )
    .setRotation({
      x: transform.rotation[0],
      y: transform.rotation[1],
      z: transform.rotation[2],
      w: transform.rotation[3],
    });
}

export function createColliderDesc(
  rapier: Rapier,
  geometry: ShapeGeometry,
  scale: Vector3Value,
) {
  switch (geometry.kind) {
    case "box":
      return rapier.ColliderDesc.cuboid(
        Math.abs(scale[0]) * geometry.width * 0.5,
        Math.abs(scale[1]) * geometry.height * 0.5,
        Math.abs(scale[2]) * geometry.depth * 0.5,
      );
    case "tube":
      return rapier.ColliderDesc.cylinder(
        Math.abs(scale[1]) * geometry.height * 0.5,
        Math.max(Math.abs(scale[0]), Math.abs(scale[2])) * geometry.radius,
      );
    case "ball":
      return rapier.ColliderDesc.ball(
        Math.max(Math.abs(scale[0]), Math.abs(scale[1]), Math.abs(scale[2])) *
          geometry.radius,
      );
  }
}

export function createSphericalJointData(
  rapier: Rapier,
  joint: SphericalJointElement,
) {
  return rapier.JointData.spherical(
    createRapierVector(joint.anchor1),
    createRapierVector(joint.anchor2),
  );
}

export function syncRigidBodyFromTransform(
  body: RigidBody,
  transform: Transform,
): void {
  const translation = {
    x: transform.position[0],
    y: transform.position[1],
    z: transform.position[2],
  };
  const rotation = {
    x: transform.rotation[0],
    y: transform.rotation[1],
    z: transform.rotation[2],
    w: transform.rotation[3],
  };

  body.setTranslation(translation, false);
  body.setRotation(rotation, false);
}

export function syncTransformPoseFromRigidBody(
  transform: Transform,
  body: RigidBody,
): void {
  const translation = body.translation();
  const rotation = body.rotation();

  Vector3.set(transform.position, translation.x, translation.y, translation.z);
  Quaternion.set(
    transform.rotation,
    rotation.x,
    rotation.y,
    rotation.z,
    rotation.w,
  );
}

function createRapierVector(vector: Vector3Value): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: vector[0],
    y: vector[1],
    z: vector[2],
  };
}
