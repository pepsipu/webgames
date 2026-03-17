import {
  createNode,
  detachNode,
  setNodeParent,
  type Node,
} from "../../node";
import {
  addComponent,
  Component,
  queryNodes,
  removeComponent,
  type NodeWith,
} from "../component";
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

export class Script extends Component {
  static readonly key = "script";
  readonly source: string;
  tickBudgetMs: number;
  context: QuickJSContext;
  runtime: QuickJSRuntime;

  constructor(
    source: string,
    tickBudgetMs: number,
    context: QuickJSContext,
    runtime: QuickJSRuntime,
  ) {
    super();
    this.source = source;
    this.tickBudgetMs = tickBudgetMs;
    this.context = context;
    this.runtime = runtime;
  }
}

export interface ScriptOptions {
  parent: Node;
  source: string;
  tickBudgetMs?: number;
}

export async function createScript(
  options: ScriptOptions,
): Promise<NodeWith<typeof Script>> {
  const runtime = (await getQuickJS()).newRuntime();
  const context = runtime.newContext();
  const node = createNode();

  addComponent(node, new Script(
    options.source,
    options.tickBudgetMs ?? defaultScriptTickBudgetMs,
    context,
    runtime,
  ));
  const scriptNode = node as NodeWith<typeof Script>;

  try {
    setNodeParent(node, options.parent);
    initializeScript(scriptNode);
    return scriptNode;
  } catch (error) {
    detachNode(node);
    destroyScript(scriptNode);
    throw error;
  }
}

function initializeScript(node: NodeWith<typeof Script>): void {
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
  node: NodeWith<typeof Script>,
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

export function tickScripts(deltaTime: number): void {
  for (const node of queryNodes(Script)) {
    tickScript(node, deltaTime);
  }
}

export function destroyScript(node: NodeWith<typeof Script>): void {
  const { script } = node;

  removeComponent(node, Script);

  script.context.dispose();
  script.runtime.dispose();
}

export function destroyScripts(): void {
  const nodes = Array.from(queryNodes(Script));

  for (const node of nodes) {
    destroyScript(node);
  }
}

function assertTickFunction(node: NodeWith<typeof Script>): void {
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
  node: NodeWith<typeof Script>,
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

function drainPendingJobs(node: NodeWith<typeof Script>): void {
  const { context, runtime } = node.script;

  while (runtime.hasPendingJob()) {
    context.unwrapResult(runtime.executePendingJobs());
  }
}
