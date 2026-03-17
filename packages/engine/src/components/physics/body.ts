import {
  addComponent,
  Component,
  getComponent,
  type NodeWith,
  removeComponent,
} from "../component";
import { Vector3 } from "../../math/vector3";
import type { Node } from "../../node";
import { Transform } from "../transform";
import { destroyPhysicsBodyInstance } from "./instance";
import type { PhysicsServiceNode } from "./service";

export type PhysicsBodyType = "dynamic" | "fixed" | "kinematic";

interface PhysicsColliderBase {
  friction?: number;
  restitution?: number;
  density?: number;
}

export interface PhysicsBallCollider extends PhysicsColliderBase {
  shape: "ball";
  radius: number;
}

export interface PhysicsCuboidCollider extends PhysicsColliderBase {
  shape: "cuboid";
  halfExtents: Vector3;
}

export interface PhysicsCylinderCollider extends PhysicsColliderBase {
  shape: "cylinder";
  radius: number;
  halfHeight: number;
}

export type PhysicsCollider =
  | PhysicsBallCollider
  | PhysicsCuboidCollider
  | PhysicsCylinderCollider;

export interface PhysicsBodyOptions {
  type?: PhysicsBodyType;
  collider: PhysicsCollider;
  gravityScale?: number;
}

export class PhysicsBody extends Component {
  static readonly key = "physicsBody";
  service: PhysicsServiceNode;
  type: PhysicsBodyType;
  collider: PhysicsCollider;
  gravityScale: number;

  constructor(service: PhysicsServiceNode, options: PhysicsBodyOptions) {
    super();
    this.service = service;
    this.type = options.type ?? "dynamic";
    this.collider = clonePhysicsCollider(options.collider);
    this.gravityScale = options.gravityScale ?? 1;
  }
}

export function setPhysicsBody<T extends NodeWith<typeof Transform>>(
  node: T,
  service: PhysicsServiceNode,
  options: PhysicsBodyOptions,
): T & NodeWith<typeof PhysicsBody> {
  removePhysicsBody(node);
  addComponent(node, new PhysicsBody(service, options));
  service.physicsService.bodies.add(node);
  return node as T & NodeWith<typeof PhysicsBody>;
}

export function removePhysicsBody(node: Node): void {
  const physicsBody = getComponent(node, PhysicsBody);

  if (!physicsBody) {
    return;
  }

  const service = physicsBody.service.physicsService;
  const instance = service.instances.get(node);

  if (instance) {
    destroyPhysicsBodyInstance(service.world, instance);
    service.instances.delete(node);
  }

  service.bodies.delete(node);
  removeComponent(node, PhysicsBody);
}

function clonePhysicsCollider(collider: PhysicsCollider): PhysicsCollider {
  if (collider.shape === "cuboid") {
    return {
      ...collider,
      halfExtents: Vector3.clone(collider.halfExtents),
    };
  }

  return { ...collider };
}
