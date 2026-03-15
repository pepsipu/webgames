import {
  createNode,
  setNodeParent,
  type Node,
  type NodeOptions,
} from "../node";
import {
  createDeadlineInterruptHandler,
  getQuickJS,
  type QuickJSContext,
  type QuickJSRuntime,
} from "./quickjs";
import { exposeScriptApi } from "./api";

const defaultScriptTickBudgetMs = 250;
const defaultScriptInitBudgetMs = 500;
const scriptFilename = "script-component.js";

export interface Script {
  readonly source: string;
  tickBudgetMs: number;
  context: QuickJSContext;
  runtime: QuickJSRuntime;
}

export interface ScriptComponent extends Node {
  script: Script;
}

export interface ScriptComponentOptions extends NodeOptions {
  source: string;
  tickBudgetMs?: number;
}

export async function createScriptComponent(
  options: ScriptComponentOptions,
): Promise<ScriptComponent> {
  const runtime = (await getQuickJS()).newRuntime();
  const context = runtime.newContext();
  const script: Script = {
    source: options.source,
    tickBudgetMs: options.tickBudgetMs ?? defaultScriptTickBudgetMs,
    context,
    runtime,
  };
  const node: ScriptComponent = {
    ...createNode(),
    script,
  };

  try {
    if (options.parent) {
      setNodeParent(node, options.parent);
    }

    exposeScriptApi(context, node);
    initializeScriptComponent(node);
    return node;
  } catch (error) {
    context.dispose();
    runtime.dispose();
    throw error;
  }
}

export function isScriptComponent(node: Node): node is ScriptComponent {
  const script = (node as { script?: Script }).script;
  return script !== undefined && "context" in script && "runtime" in script;
}

export function tickScriptComponent(
  node: ScriptComponent,
  deltaTime: number,
): void {
  const { context } = getScriptRuntime(node);

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

export function destroyScriptComponent(node: ScriptComponent): void {
  const { context, runtime } = getScriptRuntime(node);

  context.dispose();
  runtime.dispose();
}

function initializeScriptComponent(node: ScriptComponent): void {
  const { context } = getScriptRuntime(node);
  const initBudgetMs = Math.max(
    node.script.tickBudgetMs,
    defaultScriptInitBudgetMs,
  );

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
    throw new Error(
      `Script component initialization exceeded ${initBudgetMs}ms.`,
    );
  }
}

function assertTickFunction(node: ScriptComponent): void {
  const { context } = getScriptRuntime(node);
  const tickHandle = context.getProp(context.global, "tick");

  try {
    if (context.typeof(tickHandle) !== "function") {
      throw new Error(
        "Script components must define a global tick(deltaTime) function.",
      );
    }
  } finally {
    tickHandle.dispose();
  }
}

function runWithBudget(
  node: ScriptComponent,
  budgetMs: number,
  fn: () => void,
): boolean {
  const { runtime } = getScriptRuntime(node);

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

function drainPendingJobs(node: ScriptComponent): void {
  const { context, runtime } = getScriptRuntime(node);

  while (runtime.hasPendingJob()) {
    context.unwrapResult(runtime.executePendingJobs());
  }
}

function getScriptRuntime(node: ScriptComponent): Script {
  return node.script;
}
