import { createCameraNode, type CameraNode } from "./camera";
import {
  createNode,
  setNodeParent,
  type Node,
} from "./node";
import {
  createScriptNode,
  destroyScriptNode,
  isScriptNode,
  tickScriptNode,
  type ScriptNode,
  type ScriptNodeOptions,
} from "./script";
import {
  createBallNode,
  createBoxNode,
  createTubeNode,
  type BallOptions,
  type BoxOptions,
  type ShapeNode,
  type TubeOptions,
} from "./shapes";
import {
  createTransformNode,
  type TransformNode,
  type TransformNodeOptions,
} from "./transform";

export class Engine {
  camera: CameraNode;
  scene: Node;

  constructor() {
    this.scene = createNode();
    this.camera = createCameraNode();
    setNodeParent(this.camera, this.scene);
  }

  createNode(options: TransformNodeOptions = {}): TransformNode {
    const node = createTransformNode(
      options.x ?? 0,
      options.y ?? 0,
      options.z ?? 0,
    );
    setNodeParent(node, options.parent ?? this.scene);
    return node;
  }

  setParent(node: Node, parent: Node): void {
    setNodeParent(node, parent);
  }

  createBox(options: BoxOptions): ShapeNode {
    const box = createBoxNode(options);
    setNodeParent(box, options.parent ?? this.scene);
    return box;
  }

  createTube(options: TubeOptions): ShapeNode {
    const tube = createTubeNode(options);
    setNodeParent(tube, options.parent ?? this.scene);
    return tube;
  }

  createBall(options: BallOptions): ShapeNode {
    const ball = createBallNode(options);
    setNodeParent(ball, options.parent ?? this.scene);
    return ball;
  }

  async createScript(options: ScriptNodeOptions): Promise<ScriptNode> {
    return createScriptNode({
      ...options,
      parent: options.parent ?? this.scene,
    });
  }

  tick(deltaTime: number): void {
    this.#tickNode(this.scene, deltaTime);
  }

  destroy(): void {
    this.#destroyNode(this.scene);
    this.scene.children.length = 0;
  }

  #tickNode(node: Node, deltaTime: number): void {
    if (isScriptNode(node)) {
      tickScriptNode(node, deltaTime);
    }

    for (const child of node.children) {
      this.#tickNode(child, deltaTime);
    }
  }

  #destroyNode(node: Node): void {
    if (isScriptNode(node)) {
      destroyScriptNode(node);
    }

    for (const child of node.children) {
      this.#destroyNode(child);
    }
  }
}
