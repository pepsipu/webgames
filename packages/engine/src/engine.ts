import { createCamera, type CameraNode } from "./components/camera";
import {
  clearInputFrame,
  createInputService,
  type InputServiceNode,
} from "./components/input";
import { createNode, detachNode, setNodeParent, type Node } from "./node";
import {
  createScriptService,
  destroyScriptService,
  tickScriptService,
  type ScriptServiceNode,
} from "./components/script/service";

export class Engine {
  readonly camera: CameraNode;
  readonly inputService: InputServiceNode;
  readonly scriptService: ScriptServiceNode;
  readonly scene: Node;

  private constructor(
    scene: Node,
    camera: CameraNode,
    inputService: InputServiceNode,
    scriptService: ScriptServiceNode,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.inputService = inputService;
    this.scriptService = scriptService;
  }

  static async create(): Promise<Engine> {
    const scene = createNode();
    const camera = createCamera();
    const inputService = createInputService();
    const scriptService = await createScriptService();

    setNodeParent(camera, scene);
    setNodeParent(inputService, scene);
    setNodeParent(scriptService, scene);

    return new Engine(scene, camera, inputService, scriptService);
  }

  addNode<T extends Node>(node: T, parent: Node = this.scene): T {
    setNodeParent(node, parent);
    return node;
  }

  tick(deltaTime: number): void {
    try {
      tickScriptService(this.scriptService, deltaTime);
    } finally {
      clearInputFrame(this.inputService);
    }
  }

  destroy(): void {
    destroyScriptService(this.scriptService);

    while (this.scene.children.length > 0) {
      detachNode(this.scene.children[0]);
    }
  }
}
