import { createCamera, type Camera } from "./camera";
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
  setTransformParent,
  type TransformNode,
  type TransformNodeOptions,
} from "./transform";

export class Engine {
  camera: Camera;
  scene: TransformNode;

  constructor() {
    this.camera = createCamera();
    this.scene = createTransformNode();
  }

  createNode(options: TransformNodeOptions = {}): TransformNode {
    const node = createTransformNode(
      options.x ?? 0,
      options.y ?? 0,
      options.z ?? 0,
    );
    setTransformParent(node, options.parent ?? this.scene);
    return node;
  }

  setParent(node: TransformNode, parent: TransformNode): void {
    setTransformParent(node, parent);
  }

  createBox(options: BoxOptions): ShapeNode {
    const box = createBoxNode(options);
    setTransformParent(box, options.parent ?? this.scene);
    return box;
  }

  createTube(options: TubeOptions): ShapeNode {
    const tube = createTubeNode(options);
    setTransformParent(tube, options.parent ?? this.scene);
    return tube;
  }

  createBall(options: BallOptions): ShapeNode {
    const ball = createBallNode(options);
    setTransformParent(ball, options.parent ?? this.scene);
    return ball;
  }

  destroy(): void {
    this.scene.children.length = 0;
  }
}
