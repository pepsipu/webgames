import { type Element, type Engine, type EngineSystem } from "@webgames/engine";
import { ScriptElement } from "./element";
import {
  createScriptInstance,
  disposeScriptInstance,
  tickScript,
  type ScriptInstance,
} from "./runtime";

interface ScriptRecord {
  failed: boolean;
  instance: ScriptInstance | null;
  source: string;
}

export class ScriptSystem implements EngineSystem {
  readonly scripts: Map<ScriptElement, ScriptRecord>;

  constructor() {
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

    for (const [element, record] of this.scripts) {
      try {
        const current = this.refreshScript(engine.document, element, record);

        if (
          current.instance?.tickHandle === null ||
          current.instance === null
        ) {
          continue;
        }

        tickScript(element, current.instance, deltaTime);
      } catch (error) {
        console.error("Script failed and has been disabled.", error);
        disableScript(record);
      }
    }
  }

  private syncScripts(root: Element): void {
    const active = new Set<ScriptElement>();

    collectScriptElements(root, active);

    for (const element of active) {
      if (!this.scripts.has(element)) {
        this.scripts.set(element, {
          failed: false,
          instance: null,
          source: element.source,
        });
      }
    }

    for (const [element, record] of this.scripts) {
      if (active.has(element)) {
        continue;
      }

      disposeScriptInstance(record.instance);
      this.scripts.delete(element);
    }
  }

  private refreshScript(
    document: Element,
    element: ScriptElement,
    record: ScriptRecord,
  ): ScriptRecord {
    if (record.source !== element.source) {
      disposeScriptInstance(record.instance);
      record.failed = false;
      record.instance = null;
      record.source = element.source;
    }

    if (record.failed || record.instance !== null) {
      return record;
    }

    record.instance = createScriptInstance(document, element);
    return record;
  }

  private destroy(): void {
    for (const record of this.scripts.values()) {
      disposeScriptInstance(record.instance);
    }

    this.scripts.clear();
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

function disableScript(record: ScriptRecord): void {
  disposeScriptInstance(record.instance);
  record.failed = true;
  record.instance = null;
}
