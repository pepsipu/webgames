import type { QuickJSHandle } from "quickjs-emscripten-core";
import { type Element, type Engine, type EngineSystem } from "@webgames/engine";
import { createElementHandle } from "./interop";
import {
  createDeadlineInterruptHandler,
  getQuickJS,
  type QuickJSContext,
  type QuickJSRuntime,
} from "./module";
import { ScriptElement } from "./script-element";

const defaultScriptInitBudgetMs = 500;
const scriptFilename = "script-element.js";

interface ScriptInstance {
  context: QuickJSContext;
  runtime: QuickJSRuntime;
  tickHandle: QuickJSHandle | null;
}

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
        const current = this.refreshScript(engine, element, record);

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
    engine: Engine,
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

    record.instance = createScriptInstance(engine, element);
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

function createScriptInstance(
  engine: Engine,
  element: ScriptElement,
): ScriptInstance {
  const runtime = getQuickJS().newRuntime();
  let context: QuickJSContext | undefined;
  let tickHandle: QuickJSHandle | null = null;
  const initBudgetMs = Math.max(
    element.tickBudgetMs,
    defaultScriptInitBudgetMs,
  );

  try {
    const nextContext = runtime.newContext();

    context = nextContext;
    installDocument(nextContext, engine.document);

    if (
      !runWithBudget(runtime, initBudgetMs, () => {
        const evaluation = nextContext.evalCode(
          element.source,
          scriptFilename,
          {
            strict: true,
            type: "global",
          },
        );
        const evaluationValue = nextContext.unwrapResult(evaluation);

        try {
          drainPendingJobs(runtime);
          tickHandle = getTickHandle(nextContext);
        } finally {
          evaluationValue.dispose();
        }
      })
    ) {
      throw new Error(
        `Script element initialization exceeded ${initBudgetMs}ms.`,
      );
    }

    return {
      context: nextContext,
      runtime,
      tickHandle,
    };
  } catch (error) {
    disposeQuickJsHandle(tickHandle);
    context?.dispose();
    runtime.dispose();
    throw error;
  }
}

function installDocument(context: QuickJSContext, document: Element): void {
  const documentHandle = createElementHandle(context, document);

  try {
    context.setProp(context.global, "document", documentHandle);
  } finally {
    documentHandle.dispose();
  }
}

function getTickHandle(context: QuickJSContext): QuickJSHandle | null {
  const tickHandle = context.getProp(context.global, "tick");
  const tickType = context.typeof(tickHandle);

  if (tickType === "undefined") {
    tickHandle.dispose();
    return null;
  }

  if (tickType !== "function") {
    tickHandle.dispose();
    throw new Error("Script tick must be a function.");
  }

  return tickHandle;
}

function tickScript(
  element: ScriptElement,
  instance: ScriptInstance,
  deltaTime: number,
): void {
  if (
    !runWithBudget(instance.runtime, element.tickBudgetMs, () => {
      const deltaTimeHandle = instance.context.newNumber(deltaTime);

      try {
        const result = instance.context.callFunction(
          instance.tickHandle as QuickJSHandle,
          instance.context.undefined,
          deltaTimeHandle,
        );
        const value = instance.context.unwrapResult(result);

        try {
          drainPendingJobs(instance.runtime);
        } finally {
          value.dispose();
        }
      } finally {
        deltaTimeHandle.dispose();
      }
    })
  ) {
    throw new Error(`Script element tick exceeded ${element.tickBudgetMs}ms.`);
  }
}

function disableScript(record: ScriptRecord): void {
  disposeScriptInstance(record.instance);
  record.failed = true;
  record.instance = null;
}

function disposeScriptInstance(instance: ScriptInstance | null): void {
  if (instance === null) {
    return;
  }

  disposeQuickJsHandle(instance.tickHandle);
  instance.context.dispose();
  instance.runtime.dispose();
}

function disposeQuickJsHandle(handle: QuickJSHandle | null): void {
  if (handle !== null) {
    handle.dispose();
  }
}

function runWithBudget(
  runtime: QuickJSRuntime,
  budgetMs: number,
  fn: () => void,
): boolean {
  runtime.setInterruptHandler(
    createDeadlineInterruptHandler(Date.now() + budgetMs),
  );

  try {
    fn();
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "InternalError" &&
      error.message === "interrupted"
    ) {
      return false;
    }

    throw error;
  } finally {
    runtime.removeInterruptHandler();
  }
}

function drainPendingJobs(runtime: QuickJSRuntime): void {
  while (runtime.hasPendingJob()) {
    const result = runtime.executePendingJobs();
    const error = "error" in result ? result.error : undefined;

    if (error !== undefined) {
      error.context.unwrapResult(result);
    }
  }
}
