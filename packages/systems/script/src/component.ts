import {
  createNode,
  detachNode,
  setNodeParent,
  type Node,
} from "@webgame/engine";
import {
  destroyScriptNode,
  getScriptService,
  registerScriptNode,
} from "./service";

export interface Script {
  readonly source: string;
  tickBudgetMs: number;
}

export interface ScriptOptions {
  parent: Node;
  source: string;
  tickBudgetMs: number;
}

export type ScriptComponent = { script: Script };

export function createScript(options: ScriptOptions): Node & ScriptComponent {
  const service = getScriptService(options.parent);
  const node = createNode({
    script: {
      source: options.source,
      tickBudgetMs: options.tickBudgetMs,
    },
  });

  try {
    setNodeParent(node, options.parent);
    registerScriptNode(service, node);
    return node;
  } catch (error) {
    detachNode(node);
    destroyScriptNode(service, node);
    throw error;
  }
}

export function hasScript(node: Node): node is Node & ScriptComponent {
  return "script" in node;
}
