import type { QuickJSHandle } from "quickjs-emscripten-core";
import { createNode, getRootNode, type Node } from "@webgame/engine";
import { createNodeHandle } from "./api/node";
import {
  createDeadlineInterruptHandler,
  getQuickJS,
  type QuickJSContext,
  type QuickJSRuntime,
} from "./quickjs";
import type { ScriptComponent } from "./component";

const defaultScriptInitBudgetMs = 500;
const scriptFilename = "script-node.js";

export interface ScriptService {
  context: QuickJSContext;
  runtime: QuickJSRuntime;
  tickNodes: Map<Node & ScriptComponent, QuickJSHandle>;
}

export type ScriptServiceComponent = { scriptService: ScriptService };
export type ScriptServiceNode = Node & ScriptServiceComponent;

export function createScriptService(): ScriptServiceNode {
  const runtime = getQuickJS().newRuntime();

  try {
    const context = runtime.newContext();

    return createNode({
      scriptService: {
        context,
        runtime,
        tickNodes: new Map(),
      },
    });
  } catch (error) {
    runtime.dispose();
    throw error;
  }
}

export function hasScriptService(
  node: Node,
): node is Node & ScriptServiceComponent {
  return "scriptService" in node;
}

export function getScriptService(node: Node): ScriptServiceNode {
  const service = getRootNode(node).children.find(hasScriptService);

  if (service === undefined) {
    throw new Error("Script system is not installed.");
  }

  return service;
}

export function registerScriptNode(
  serviceNode: ScriptServiceNode,
  node: Node & ScriptComponent,
): void {
  const service = serviceNode.scriptService;

  const tickHandle = initializeScriptNode(serviceNode, node);
  service.tickNodes.set(node, tickHandle);
}

export function destroyScriptNode(
  serviceNode: ScriptServiceNode,
  node: Node & ScriptComponent,
): void {
  const service = serviceNode.scriptService;
  const tickHandle = service.tickNodes.get(node);

  if (tickHandle === undefined) {
    return;
  }

  tickHandle.dispose();
  service.tickNodes.delete(node);
}

export function tickScriptService(
  serviceNode: ScriptServiceNode,
  deltaTime: number,
): void {
  const service = serviceNode.scriptService;
  const { context } = service;

  for (const [node, tickHandle] of service.tickNodes) {
    runWithBudget(serviceNode, node.script.tickBudgetMs, () => {
      const deltaTimeHandle = context.newNumber(deltaTime);

      try {
        const result = context.callFunction(
          tickHandle,
          context.undefined,
          deltaTimeHandle,
        );
        const value = context.unwrapResult(result);

        value.dispose();
        drainPendingJobs(serviceNode);
      } finally {
        deltaTimeHandle.dispose();
      }
    });
  }
}

export function destroyScriptService(serviceNode: ScriptServiceNode): void {
  const service = serviceNode.scriptService;
  for (const tickHandle of service.tickNodes.values()) {
    tickHandle.dispose();
  }

  service.tickNodes.clear();
  service.context.dispose();
  service.runtime.dispose();
}

function initializeScriptNode(
  serviceNode: ScriptServiceNode,
  node: Node & ScriptComponent,
): QuickJSHandle {
  const context = getScriptContext(serviceNode);
  const initBudgetMs = Math.max(
    node.script.tickBudgetMs,
    defaultScriptInitBudgetMs,
  );
  let tickHandle: QuickJSHandle | null = null;

  try {
    if (
      !runWithBudget(serviceNode, initBudgetMs, () => {
        tickHandle = createTickHandle(context, node);
        assertTickFunction(context, tickHandle);
        drainPendingJobs(serviceNode);
      })
    ) {
      throw new Error(`Script node initialization exceeded ${initBudgetMs}ms.`);
    }

    if (tickHandle === null) {
      throw new Error("Script node did not create a tick(deltaTime) function.");
    }

    return tickHandle;
  } catch (error) {
    disposeQuickJsHandle(tickHandle);
    throw error;
  }
}

function createTickHandle(
  context: QuickJSContext,
  node: Node & ScriptComponent,
): QuickJSHandle {
  const documentHandle = createNodeHandle(context, getRootNode(node));

  try {
    const result = context.evalCode(
      getScriptFactorySource(node.script.source),
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
    throw new Error("Script nodes must define a tick(deltaTime) function.");
  }
}

function runWithBudget(
  serviceNode: ScriptServiceNode,
  budgetMs: number,
  fn: () => void,
): boolean {
  const runtime = getScriptRuntime(serviceNode);

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

function drainPendingJobs(serviceNode: ScriptServiceNode): void {
  const runtime = getScriptRuntime(serviceNode);

  while (runtime.hasPendingJob()) {
    const result = runtime.executePendingJobs();

    if ("error" in result) {
      throw result.error;
    }
  }
}

function getScriptContext(serviceNode: ScriptServiceNode): QuickJSContext {
  return serviceNode.scriptService.context;
}

function getScriptRuntime(serviceNode: ScriptServiceNode): QuickJSRuntime {
  return serviceNode.scriptService.runtime;
}
