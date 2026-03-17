import { createCamera, type CameraNode } from "./components/camera";
import { createNode, detachNode, setNodeParent, type Node } from "./node";
import {
  createScriptService,
  destroyScriptService,
  tickScriptService,
  type ScriptServiceNode,
} from "./components/script/service";

export class Engine {
  readonly camera: CameraNode;
  readonly scriptService: ScriptServiceNode;
  readonly scene: Node;

  private constructor(
    scene: Node,
    camera: CameraNode,
    scriptService: ScriptServiceNode,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.scriptService = scriptService;
  }

  static async create(): Promise<Engine> {
    const scene = createNode();
    const camera = createCamera();
    const scriptService = await createScriptService();

    setNodeParent(camera, scene);
    setNodeParent(scriptService, scene);

    return new Engine(scene, camera, scriptService);
  }

  addNode<T extends Node>(node: T, parent: Node = this.scene): T {
    setNodeParent(node, parent);
    return node;
  }

  tick(deltaTime: number): void {
    tickScriptService(this.scriptService, deltaTime);
  }

  destroy(): void {
    destroyScriptService(this.scriptService);

    while (this.scene.children.length > 0) {
      detachNode(this.scene.children[0]);
    }
  }
}
