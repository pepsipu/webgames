import type { QuickJSHandle } from "quickjs-emscripten-core";
import { createElement, Element, type Engine } from "@webgame/engine";
import { createDocumentHandle } from "./api/element";
import {
  createDeadlineInterruptHandler,
  getQuickJS,
  type QuickJSContext,
  type QuickJSRuntime,
} from "./quickjs";
import type { ScriptComponent } from "./component";

const defaultScriptInitBudgetMs = 500;
const scriptFilename = "script-element.js";

export interface ScriptService {
  context: QuickJSContext;
  runtime: QuickJSRuntime;
  tickElements: Map<Element & ScriptComponent, QuickJSHandle | null>;
}

export type ScriptServiceComponent = { scriptService: ScriptService };
export type ScriptServiceElement = Element & ScriptServiceComponent;

export function createScriptService(): ScriptServiceElement {
  const runtime = getQuickJS().newRuntime();

  try {
    const context = runtime.newContext();

    return createElement({
      scriptService: {
        context,
        runtime,
        tickElements: new Map(),
      },
    });
  } catch (error) {
    runtime.dispose();
    throw error;
  }
}

export function hasScriptService(
  element: Element,
): element is Element & ScriptServiceComponent {
  return "scriptService" in element;
}

export function getScriptService(root: Element): ScriptServiceElement {
  const service = root.children.find(hasScriptService);

  if (service === undefined) {
    throw new Error("Script system is not installed.");
  }

  return service;
}

export function registerScriptElement(
  serviceElement: ScriptServiceElement,
  element: Element & ScriptComponent,
): void {
  serviceElement.scriptService.tickElements.set(element, null);
}

export function destroyScriptElement(
  serviceElement: ScriptServiceElement,
  element: Element & ScriptComponent,
): void {
  const service = serviceElement.scriptService;
  const tickHandle = service.tickElements.get(element);

  if (tickHandle === undefined) {
    return;
  }

  tickHandle?.dispose();
  service.tickElements.delete(element);
}

export function tickScriptService(
  serviceElement: ScriptServiceElement,
  engine: Engine,
  deltaTime: number,
): void {
  const service = serviceElement.scriptService;
  const { context } = service;

  for (const [element, tickHandle] of service.tickElements) {
    const nextTickHandle =
      tickHandle ?? initializeScriptElement(serviceElement, engine, element);

    if (tickHandle === null) {
      service.tickElements.set(element, nextTickHandle);
    }

    runWithBudget(serviceElement, element.script.tickBudgetMs, () => {
      const deltaTimeHandle = context.newNumber(deltaTime);

      try {
        const result = context.callFunction(
          nextTickHandle,
          context.undefined,
          deltaTimeHandle,
        );
        const value = context.unwrapResult(result);

        value.dispose();
        drainPendingJobs(serviceElement);
      } finally {
        deltaTimeHandle.dispose();
      }
    });
  }
}

export function destroyScriptService(
  serviceElement: ScriptServiceElement,
): void {
  const service = serviceElement.scriptService;
  for (const tickHandle of service.tickElements.values()) {
    tickHandle?.dispose();
  }

  service.tickElements.clear();
  service.context.dispose();
  service.runtime.dispose();
}

function initializeScriptElement(
  serviceElement: ScriptServiceElement,
  engine: Engine,
  element: Element & ScriptComponent,
): QuickJSHandle {
  const context = getScriptContext(serviceElement);
  const initBudgetMs = Math.max(
    element.script.tickBudgetMs,
    defaultScriptInitBudgetMs,
  );
  let tickHandle: QuickJSHandle | null = null;

  try {
    if (
      !runWithBudget(serviceElement, initBudgetMs, () => {
        tickHandle = createTickHandle(context, engine, element);
        assertTickFunction(context, tickHandle);
        drainPendingJobs(serviceElement);
      })
    ) {
      throw new Error(
        `Script element initialization exceeded ${initBudgetMs}ms.`,
      );
    }

    if (tickHandle === null) {
      throw new Error(
        "Script element did not create a tick(deltaTime) function.",
      );
    }

    return tickHandle;
  } catch (error) {
    disposeQuickJsHandle(tickHandle);
    throw error;
  }
}

function createTickHandle(
  context: QuickJSContext,
  engine: Engine,
  element: Element & ScriptComponent,
): QuickJSHandle {
  const documentHandle = createDocumentHandle(context, engine);

  try {
    const result = context.evalCode(
      getScriptFactorySource(element.script.source),
      scriptFilename,
      {
        strict: true,
        type: "global",
      },
    );
    const factoryHandle = context.unwrapResult(result);

    try {
      const tickResult = context.callFunction(
        factoryHandle,
        context.undefined,
        documentHandle,
      );

      return context.unwrapResult(tickResult);
    } finally {
      factoryHandle.dispose();
    }
  } finally {
    documentHandle.dispose();
  }
}

function getScriptFactorySource(source: string): string {
  return `((document) => {\n${source}\nreturn tick;\n})`;
}

function disposeQuickJsHandle(handle: QuickJSHandle | null): void {
  if (handle !== null) {
    handle.dispose();
  }
}

function assertTickFunction(
  context: QuickJSContext,
  tickHandle: QuickJSHandle,
): void {
  if (context.typeof(tickHandle) !== "function") {
    throw new Error("Script elements must define a tick(deltaTime) function.");
  }
}

function runWithBudget(
  serviceElement: ScriptServiceElement,
  budgetMs: number,
  fn: () => void,
): boolean {
  const runtime = getScriptRuntime(serviceElement);

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

function drainPendingJobs(serviceElement: ScriptServiceElement): void {
  const runtime = getScriptRuntime(serviceElement);

  while (runtime.hasPendingJob()) {
    const result = runtime.executePendingJobs();

    if ("error" in result) {
      throw result.error;
    }
  }
}

function getScriptContext(
  serviceElement: ScriptServiceElement,
): QuickJSContext {
  return serviceElement.scriptService.context;
}

function getScriptRuntime(
  serviceElement: ScriptServiceElement,
): QuickJSRuntime {
  return serviceElement.scriptService.runtime;
}
