import { createNode, detachNode, setNodeParent, type Node } from "./node";

export interface EngineSystem {
  install(engine: Engine): void | Promise<void>;
}

export type EngineTickHandler = (deltaTime: number) => void;
export type EngineAfterTickHandler = () => void;
export type EngineDestroyHandler = () => void;

export class Engine {
  readonly scene: Node;
  readonly tickHandlers: EngineTickHandler[];
  readonly afterTickHandlers: EngineAfterTickHandler[];
  readonly destroyHandlers: EngineDestroyHandler[];

  private constructor(scene: Node) {
    this.scene = scene;
    this.tickHandlers = [];
    this.afterTickHandlers = [];
    this.destroyHandlers = [];
  }

  static async create(systems: EngineSystem[]): Promise<Engine> {
    const engine = new Engine(createNode());

    for (const system of systems) {
      await system.install(engine);
    }

    return engine;
  }

  addNode<T extends Node>(node: T, parent: Node = this.scene): T {
    setNodeParent(node, parent);
    return node;
  }

  tick(deltaTime: number): void {
    try {
      for (const handler of this.tickHandlers) {
        handler(deltaTime);
      }
    } finally {
      for (const handler of this.afterTickHandlers) {
        handler();
      }
    }
  }

  destroy(): void {
    for (let index = this.destroyHandlers.length - 1; index >= 0; index -= 1) {
      this.destroyHandlers[index]();
    }
    while (this.scene.children.length > 0) {
      detachNode(this.scene.children[0]);
    }
  }
}
