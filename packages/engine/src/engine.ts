import {
  createCameraComponent,
  type CameraComponent,
} from "./nodes/camera";
import {
  createNode,
  setNodeParent,
  type Node,
} from "./nodes/node";
import {
  createScriptComponent,
  destroyScriptComponent,
  isScriptComponent,
  tickScriptComponent,
  type ScriptComponent,
  type ScriptComponentOptions,
} from "./nodes/script";
import {
  createBallComponent,
  createBoxComponent,
  createTubeComponent,
  type BallOptions,
  type BoxOptions,
  type ShapeComponent,
  type TubeOptions,
} from "./nodes/shapes";
import {
  createTransformComponent,
  type TransformComponent,
  type TransformComponentOptions,
} from "./nodes/transform";

export class Engine {
  camera: CameraComponent;
  scene: Node;

  constructor() {
    this.scene = createNode();
    this.camera = createCameraComponent();
    setNodeParent(this.camera, this.scene);
  }

  createNode(options: TransformComponentOptions = {}): TransformComponent {
    const node = createTransformComponent(
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

  createBox(options: BoxOptions): ShapeComponent {
    const box = createBoxComponent(options);
    setNodeParent(box, options.parent ?? this.scene);
    return box;
  }

  createTube(options: TubeOptions): ShapeComponent {
    const tube = createTubeComponent(options);
    setNodeParent(tube, options.parent ?? this.scene);
    return tube;
  }

  createBall(options: BallOptions): ShapeComponent {
    const ball = createBallComponent(options);
    setNodeParent(ball, options.parent ?? this.scene);
    return ball;
  }

  async createScript(
    options: ScriptComponentOptions,
  ): Promise<ScriptComponent> {
    return createScriptComponent({
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
    if (isScriptComponent(node)) {
      tickScriptComponent(node, deltaTime);
    }

    for (const child of node.children) {
      this.#tickNode(child, deltaTime);
    }
  }

  #destroyNode(node: Node): void {
    if (isScriptComponent(node)) {
      destroyScriptComponent(node);
    }

    for (const child of node.children) {
      this.#destroyNode(child);
    }
  }
}
