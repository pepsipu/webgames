import { createNode, detachNode, setNodeParent, type Node } from "../../node";
import {
  destroyScriptNode,
  registerScriptNode,
  type ScriptServiceNode,
} from "./service";

export interface Script {
  readonly source: string;
  tickBudgetMs: number;
}

export interface ScriptOptions {
  parent: Node;
  service: ScriptServiceNode;
  source: string;
  tickBudgetMs: number;
}

export type ScriptComponent = { script: Script };

export function createScript(options: ScriptOptions): Node & ScriptComponent {
  const node = createNode({
    script: {
      source: options.source,
      tickBudgetMs: options.tickBudgetMs,
    },
  });

  try {
    setNodeParent(node, options.parent);
    registerScriptNode(options.service, node);
    return node;
  } catch (error) {
    detachNode(node);
    destroyScriptNode(options.service, node);
    throw error;
  }
}

export function hasScript(node: Node): node is Node & ScriptComponent {
  return "script" in node;
}
