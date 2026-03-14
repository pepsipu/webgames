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

const defaultScriptTickBudgetMs = 2;
const defaultScriptInitBudgetMs = 10;
const scriptFilename = "script-node.js";

export interface Script {
  readonly source: string;
  tickBudgetMs: number;
  context: QuickJSContext;
  runtime: QuickJSRuntime;
}

export interface ScriptNode extends Node {
  script: Script;
}

export interface ScriptNodeOptions extends NodeOptions {
  source: string;
  tickBudgetMs?: number;
}

export async function createScriptNode(
  options: ScriptNodeOptions,
): Promise<ScriptNode> {
  const runtime = (await getQuickJS()).newRuntime();
  const context = runtime.newContext();
  const script: Script = {
    source: options.source,
    tickBudgetMs: options.tickBudgetMs ?? defaultScriptTickBudgetMs,
    context,
    runtime,
  };
  const node: ScriptNode = {
    ...createNode(),
    script,
  };

  try {
    if (options.parent) {
      setNodeParent(node, options.parent);
    }

    exposeScriptApi(context, node);
    initializeScriptNode(node);
    return node;
  } catch (error) {
    context.dispose();
    runtime.dispose();
    throw error;
  }
}

export function isScriptNode(node: Node): node is ScriptNode {
  const script = (node as { script?: Script }).script;
  return script !== undefined && "context" in script && "runtime" in script;
}

export function tickScriptNode(node: ScriptNode, deltaTime: number): void {
  const { context } = getScriptRuntime(node);

  runWithBudget(node, node.script.tickBudgetMs, () => {
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
  });
}

export function destroyScriptNode(node: ScriptNode): void {
  const { context, runtime } = getScriptRuntime(node);

  context.dispose();
  runtime.dispose();
}

function initializeScriptNode(node: ScriptNode): void {
  const { context } = getScriptRuntime(node);

  runWithBudget(
    node,
    Math.max(node.script.tickBudgetMs, defaultScriptInitBudgetMs),
    () => {
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
    },
  );
}

function assertTickFunction(node: ScriptNode): void {
  const { context } = getScriptRuntime(node);
  const tickHandle = context.getProp(context.global, "tick");

  try {
    if (context.typeof(tickHandle) !== "function") {
      throw new Error(
        "Script nodes must define a global tick(deltaTime) function.",
      );
    }
  } finally {
    tickHandle.dispose();
  }
}

function runWithBudget(
  node: ScriptNode,
  budgetMs: number,
  fn: () => void,
): void {
  const { runtime } = getScriptRuntime(node);

  runtime.setInterruptHandler(
    createDeadlineInterruptHandler(Date.now() + budgetMs),
  );

  try {
    fn();
  } finally {
    runtime.removeInterruptHandler();
  }
}

function drainPendingJobs(node: ScriptNode): void {
  const { context, runtime } = getScriptRuntime(node);

  while (runtime.hasPendingJob()) {
    context.unwrapResult(runtime.executePendingJobs());
  }
}

function getScriptRuntime(node: ScriptNode): Script {
  return node.script;
}
