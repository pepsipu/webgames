import {
  createCamera,
  type CameraNode,
} from "./components/camera";
import {
  createPhysicsService,
  destroyPhysics,
  tickPhysics,
  type PhysicsServiceNode,
} from "./components/physics";
import {
  destroyScripts,
  tickScripts,
} from "./components/script";
import {
  createNode,
  detachNode,
  setNodeParent,
  type Node,
} from "./node";

export class Engine {
  camera: CameraNode;
  physics: PhysicsServiceNode;
  scene: Node;

  constructor() {
    this.scene = createNode();
    this.camera = createCamera();
    this.physics = createPhysicsService();
    this.addNode(this.camera);
  }

  addNode<T extends Node>(node: T, parent: Node = this.scene): T {
    setNodeParent(node, parent);
    return node;
  }

  tick(deltaTime: number): void {
    tickScripts(deltaTime);
    tickPhysics(this.physics, deltaTime);
  }

  destroy(): void {
    destroyScripts();
    destroyPhysics(this.physics);

    while (this.scene.children.length > 0) {
      detachNode(this.scene.children[0]);
    }
  }
}
