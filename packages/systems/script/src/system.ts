import { type Element, type Engine, type EngineSystem } from "@webgames/engine";
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
    engine.tickHandlers.push((engine, deltaTime) => {
      this.tick(engine, deltaTime);
    });
    engine.destroyHandlers.push(() => {
      this.destroy();
    });
  }

  private tick(engine: Engine, deltaTime: number): void {
    this.syncScripts(engine.document);

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

  private syncScripts(root: Element): void {
    const active = new Set<ScriptElement>();

    collectScriptElements(root, active);

    for (const element of active) {
      if (!this.scripts.has(element)) {
        this.scripts.set(element, new ScriptState(this.runtime, root, element));
      }
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

function collectScriptElements(
  element: Element,
  scripts: Set<ScriptElement>,
): void {
  for (const child of element.children) {
    if (child instanceof ScriptElement) {
      scripts.add(child);
    }

    collectScriptElements(child, scripts);
  }
}
