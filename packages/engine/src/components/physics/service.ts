import { World } from "@dimforge/rapier3d";
import { createNode, type Node } from "../../node";
import { addComponent, Component, type NodeWith } from "../component";
import {
  createPhysicsBodyInstance,
  destroyPhysicsBodyInstance,
  syncPhysicsBodyInstance,
  writePhysicsBodyTransform,
  type PhysicsBodyInstance,
  type PhysicsBodyNode,
} from "./instance";

export class PhysicsService extends Component {
  static readonly key = "physicsService";
  world: World;
  bodies: Set<Node>;
  instances: Map<Node, PhysicsBodyInstance>;

  constructor() {
    super();
    this.world = new World({ x: 0, y: -9.81, z: 0 });
    this.bodies = new Set();
    this.instances = new Map();
  }
}

export type PhysicsServiceNode = NodeWith<typeof PhysicsService>;

export function createPhysicsService(): PhysicsServiceNode {
  const node = createNode();

  addComponent(node, new PhysicsService());

  return node as PhysicsServiceNode;
}

export function tickPhysics(
  serviceNode: PhysicsServiceNode,
  deltaTime: number,
): void {
  const service = serviceNode.physicsService;

  if (service.bodies.size === 0) {
    return;
  }

  for (const body of service.bodies) {
    const node = body as PhysicsBodyNode;
    let instance = service.instances.get(node);

    if (!instance) {
      instance = createPhysicsBodyInstance(service.world, node);
      service.instances.set(node, instance);
    }

    syncPhysicsBodyInstance(node, instance);
  }

  service.world.timestep = deltaTime;
  service.world.step();

  for (const body of service.bodies) {
    const node = body as PhysicsBodyNode;
    writePhysicsBodyTransform(node, service.instances.get(node)!);
  }
}

export function destroyPhysics(serviceNode: PhysicsServiceNode): void {
  const service = serviceNode.physicsService;

  for (const instance of service.instances.values()) {
    destroyPhysicsBodyInstance(service.world, instance);
  }

  service.instances.clear();
  service.bodies.clear();
  service.world.free();
}
