import {
  createNode,
  detachNode,
  setNodeParent,
  type Node,
} from "../../node";
import {
  createDeadlineInterruptHandler,
  getQuickJS,
  type QuickJSContext,
  type QuickJSRuntime,
} from "./quickjs";
import { exposeScriptApi } from "./api";

const defaultScriptTickBudgetMs = 250;
const defaultScriptInitBudgetMs = 500;
const scriptFilename = "script-node.js";

export interface Script {
  readonly source: string;
  tickBudgetMs: number;
  context: QuickJSContext;
  runtime: QuickJSRuntime;
}

export interface ScriptOptions {
  parent: Node;
  source: string;
  tickBudgetMs?: number;
}

export type ScriptComponent = { script: Script };

export async function createScript(
  options: ScriptOptions,
): Promise<Node & ScriptComponent> {
  const runtime = (await getQuickJS()).newRuntime();
  const context = runtime.newContext();
  const node = createNode({
    script: {
      source: options.source,
      tickBudgetMs: options.tickBudgetMs ?? defaultScriptTickBudgetMs,
      context,
      runtime,
    },
  });

  try {
    setNodeParent(node, options.parent);
    initializeScript(node);
    return node;
  } catch (error) {
    detachNode(node);
    destroyScript(node);
    throw error;
  }
}

export function hasScript(node: Node): node is Node & ScriptComponent {
  return (node as { script?: Script }).script !== undefined;
}

function initializeScript(node: Node & ScriptComponent): void {
  const { context } = node.script;
  const initBudgetMs = Math.max(
    node.script.tickBudgetMs,
    defaultScriptInitBudgetMs,
  );

  exposeScriptApi(context, node);

  if (
    !runWithBudget(node, initBudgetMs, () => {
      const result = context.evalCode(node.script.source, scriptFilename, {
        strict: true,
        type: "global",
      });
      const value = context.unwrapResult(result);

      try {
        assertTickFunction(node);
        drainPendingJobs(node);
      } finally {
        value.dispose();
      }
    })
  ) {
    throw new Error(`Script node initialization exceeded ${initBudgetMs}ms.`);
  }
}

export function tickScript(
  node: Node & ScriptComponent,
  deltaTime: number,
): void {
  const { context } = node.script;

  if (
    !runWithBudget(node, node.script.tickBudgetMs, () => {
      const tickHandle = context.getProp(context.global, "tick");
      const deltaTimeHandle = context.newNumber(deltaTime);

      try {
        const result = context.callFunction(
          tickHandle,
          context.undefined,
          deltaTimeHandle,
        );
        const value = context.unwrapResult(result);

        value.dispose();
        drainPendingJobs(node);
      } finally {
        deltaTimeHandle.dispose();
        tickHandle.dispose();
      }
    })
  ) {
    return;
  }
}

export function destroyScript(node: Node & ScriptComponent): void {
  const { context, runtime } = node.script;

  context.dispose();
  runtime.dispose();
}

function assertTickFunction(node: Node & ScriptComponent): void {
  const { context } = node.script;
  const tickHandle = context.getProp(context.global, "tick");

  try {
    if (context.typeof(tickHandle) !== "function") {
      throw new Error("Script nodes must define a global tick(deltaTime) function.");
    }
  } finally {
    tickHandle.dispose();
  }
}

function runWithBudget(
  node: Node & ScriptComponent,
  budgetMs: number,
  fn: () => void,
): boolean {
  const { runtime } = node.script;

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

function drainPendingJobs(node: Node & ScriptComponent): void {
  const { context, runtime } = node.script;

  while (runtime.hasPendingJob()) {
    context.unwrapResult(runtime.executePendingJobs());
  }
}
