import {
  type Element,
  type Engine,
  type EngineSystem,
  walkElements,
} from "@webgames/engine";
import type { QuickJSRuntime } from "quickjs-emscripten-core";
import { ScriptElement } from "./element";
import { createDeadlineInterruptHandler, getQuickJS } from "./module";
import { ScriptState } from "./runtime";

const scriptTickBudgetMs = 250;

export class ScriptSystem implements EngineSystem {
  readonly runtime: QuickJSRuntime;
  readonly scripts: Map<ScriptElement, ScriptState>;

  constructor() {
    this.runtime = getQuickJS().newRuntime();
    this.scripts = new Map();
  }

  install(engine: Engine): void {
    engine.registry.register(ScriptElement);
    engine.tickHandlers.push((engine, deltaTime) => {
      this.tick(engine, deltaTime);
    });
    engine.destroyHandlers.push(() => {
      this.destroy();
    });
  }

  private tick(engine: Engine, deltaTime: number): void {
    this.syncScripts(engine, engine.document);

    for (const state of this.scripts.values()) {
      this.runtime.setInterruptHandler(
        createDeadlineInterruptHandler(Date.now() + scriptTickBudgetMs),
      );

      try {
        state.tick(deltaTime);
      } finally {
        this.runtime.removeInterruptHandler();
      }
    }
  }

  private syncScripts(engine: Engine, root: Element): void {
    const active = new Set<ScriptElement>();

    for (const element of walkElements(root)) {
      if (element instanceof ScriptElement) {
        active.add(element);
      }
    }

    for (const element of active) {
      const existing = this.scripts.get(element);

      if (existing === undefined) {
        this.scripts.set(
          element,
          new ScriptState(this.runtime, engine.registry, root, element),
        );
        continue;
      }

      if (existing.source === element.text) {
        continue;
      }

      existing.destroy();
      this.scripts.set(
        element,
        new ScriptState(this.runtime, engine.registry, root, element),
      );
    }

    for (const [element, state] of this.scripts) {
      if (active.has(element)) {
        continue;
      }

      state.destroy();
      this.scripts.delete(element);
    }
  }

  private destroy(): void {
    for (const state of this.scripts.values()) {
      state.destroy();
    }

    this.scripts.clear();
    this.runtime.dispose();
  }
}
