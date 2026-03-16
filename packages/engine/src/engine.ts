import {
  createCamera,
  type CameraNode,
} from "./components/camera";
import {
  createNode,
  detachNode,
  setNodeParent,
  type Node,
} from "./node";
import {
  destroyScript,
  hasScript,
  tickScript,
} from "./components/script";

export class Engine {
  camera: CameraNode;
  scene: Node;

  constructor() {
    this.scene = createNode();
    this.camera = createCamera();
    this.addNode(this.camera);
  }

  addNode<T extends Node>(node: T, parent: Node = this.scene): T {
    setNodeParent(node, parent);
    return node;
  }

  tick(deltaTime: number): void {
    this.#tickNode(this.scene, deltaTime);
  }

  destroy(): void {
    this.#destroyNode(this.scene);

    while (this.scene.children.length > 0) {
      detachNode(this.scene.children[0]);
    }
  }

  #tickNode(node: Node, deltaTime: number): void {
    if (hasScript(node)) {
      tickScript(node, deltaTime);
    }

    for (const child of node.children) {
      this.#tickNode(child, deltaTime);
    }
  }

  #destroyNode(node: Node): void {
    if (hasScript(node)) {
      destroyScript(node);
    }

    for (const child of node.children) {
      this.#destroyNode(child);
    }
  }
}
