import { createElement, Element } from "./element";

export interface EngineSystem {
  install(engine: Engine): void;
}

export type EngineTickHandler = (engine: Engine, deltaTime: number) => void;
export type EngineAfterTickHandler = (engine: Engine) => void;
export type EngineDestroyHandler = (engine: Engine) => void;

export class Engine {
  readonly document: Element;
  readonly tickHandlers: EngineTickHandler[];
  readonly afterTickHandlers: EngineAfterTickHandler[];
  readonly destroyHandlers: EngineDestroyHandler[];

  constructor(systems: EngineSystem[]) {
    this.document = createElement();
    this.tickHandlers = [];
    this.afterTickHandlers = [];
    this.destroyHandlers = [];

    for (const system of systems) {
      system.install(this);
    }
  }

  getElementById(id: string): Element | null {
    return findElementById(this.document.children, id);
  }

  tick(deltaTime: number): void {
    try {
      for (const handler of this.tickHandlers) {
        handler(this, deltaTime);
      }
    } finally {
      for (const handler of this.afterTickHandlers) {
        handler(this);
      }
    }
  }

  destroy(): void {
    for (let index = this.destroyHandlers.length - 1; index >= 0; index -= 1) {
      this.destroyHandlers[index](this);
    }
    while (this.document.childElementCount > 0) {
      this.document.removeChild(this.document.children[0]);
    }
  }
}

function findElementById(
  children: readonly Element[],
  id: string,
): Element | null {
  for (const child of children) {
    if (child.id === id) {
      return child;
    }

    const match = findElementById(child.children, id);

    if (match !== null) {
      return match;
    }
  }

  return null;
}
