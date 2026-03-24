import type { Element } from "@webgames/engine";
import type { QuickJSHandle } from "quickjs-emscripten-core";
import {
  createDeadlineInterruptHandler,
  getQuickJS,
  type QuickJSContext,
  type QuickJSRuntime,
} from "./module";
import { ScriptElement } from "./element";
import { installScriptGlobals } from "./globals";

const defaultScriptInitBudgetMs = 500;
const filename = "element.js";

export interface ScriptInstance {
  context: QuickJSContext;
  runtime: QuickJSRuntime;
  tickHandle: QuickJSHandle | null;
}

export function createScriptInstance(
  document: Element,
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
    installScriptGlobals(nextContext, document);

    if (
      !runWithBudget(runtime, initBudgetMs, () => {
        const evaluation = nextContext.evalCode(
          element.source,
          filename,
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

export function tickScript(
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

export function disposeScriptInstance(instance: ScriptInstance | null): void {
  if (instance === null) {
    return;
  }

  disposeQuickJsHandle(instance.tickHandle);
  instance.context.dispose();
  instance.runtime.dispose();
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
