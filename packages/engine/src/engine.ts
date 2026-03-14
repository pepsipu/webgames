import { createCamera, type Camera } from "./camera";
import {
  createNode,
  setNodeParent,
  type Node,
} from "./node";
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
  camera: Camera;
  scene: Node;

  constructor() {
    this.camera = createCamera();
    this.scene = createNode();
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

  destroy(): void {
    this.scene.children.length = 0;
  }
}
