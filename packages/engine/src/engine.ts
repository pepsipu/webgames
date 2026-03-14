import { createCamera, type Camera } from "./camera";
import {
  createBallGeometry,
  createBoxGeometry,
  createTubeGeometry,
} from "./geometry";
import {
  createTransformNode,
  setTransformParent,
  type TransformNode,
  type TransformNodeOptions,
} from "./transform";
import {
  createBallSolid,
  createBoxSolid,
  createTubeSolid,
  type Ball,
  type BallOptions,
  type Box,
  type BoxOptions,
  type Tube,
  type TubeOptions,
} from "./solids";

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

  createBox(options: BoxOptions): Box {
    const solid = createBoxSolid(
      options,
      createBoxGeometry({
        width: options.width,
        height: options.height,
        depth: options.depth,
      }),
    );
    setTransformParent(solid, options.parent ?? this.scene);
    return solid;
  }

  createTube(options: TubeOptions): Tube {
    const solid = createTubeSolid(
      options,
      createTubeGeometry({
        radius: options.radius,
        height: options.height,
        segments: options.segments ?? 24,
      }),
    );
    setTransformParent(solid, options.parent ?? this.scene);
    return solid;
  }

  createBall(options: BallOptions): Ball {
    const solid = createBallSolid(
      options,
      createBallGeometry({
        radius: options.radius,
        segments: options.segments ?? 20,
        rings: options.rings ?? 14,
      }),
    );
    setTransformParent(solid, options.parent ?? this.scene);
    return solid;
  }

  destroy(): void {
    this.scene.children.length = 0;
  }
}
