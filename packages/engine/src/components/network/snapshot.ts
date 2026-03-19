import { createNode, detachNode, getRootNode, setNodeParent, type Node } from "../../node";
import { hasInputService } from "../input";
import { hasScript, type ScriptComponent } from "../script";
import {
  destroyScriptNode,
  hasScriptService,
  registerScriptNode,
  type ScriptServiceNode,
} from "../script/service";

export interface NodeSnapshot extends Record<string, unknown> {
  children: NodeSnapshot[];
}

export function createNodeSnapshot(node: Node): NodeSnapshot {
  return JSON.parse(
    JSON.stringify(node, (key, value) => {
      if (key === "parent") {
        return undefined;
      }

      if (key === "children") {
        return (value as Node[]).filter(isSceneNode);
      }

      return value;
    }),
  ) as NodeSnapshot;
}

export function applyNodeSnapshot(node: Node, snapshot: NodeSnapshot): void {
  syncNode(node, snapshot, getRootNode(node).children.find(hasScriptService));
}

function syncNode(
  node: Node,
  snapshot: NodeSnapshot,
  scriptService: ScriptServiceNode | undefined,
): void {
  const previousScript = hasScript(node) ? node : undefined;

  syncNodeProperties(node, snapshot);
  syncNodeChildren(node, snapshot.children, scriptService);
  syncNodeScript(node, scriptService, previousScript);
}

function syncNodeProperties(node: Node, snapshot: NodeSnapshot): void {
  const target = node as unknown as Record<string, unknown>;

  for (const key of Object.keys(target)) {
    if (key === "children" || key === "parent") {
      continue;
    }

    if (!(key in snapshot)) {
      delete target[key];
    }
  }

  for (const [key, value] of Object.entries(snapshot)) {
    if (key === "children") {
      continue;
    }

    target[key] = value;
  }
}

function syncNodeChildren(
  parent: Node,
  snapshots: NodeSnapshot[],
  scriptService: ScriptServiceNode | undefined,
): void {
  const children = parent.children.filter(isSceneNode);

  for (let index = 0; index < snapshots.length; index += 1) {
    const child = children[index];

    if (child === undefined) {
      const nextChild = createNode();

      setNodeParent(nextChild, parent);
      syncNode(nextChild, snapshots[index], scriptService);
      continue;
    }

    syncNode(child, snapshots[index], scriptService);
  }

  for (let index = snapshots.length; index < children.length; index += 1) {
    destroySceneNode(children[index], scriptService);
    detachNode(children[index]);
  }
}

function syncNodeScript(
  node: Node,
  scriptService: ScriptServiceNode | undefined,
  previousScript: (Node & ScriptComponent) | undefined,
): void {
  if (scriptService === undefined) {
    return;
  }

  if (previousScript !== undefined && !hasScript(node)) {
    destroyScriptNode(scriptService, previousScript);
    return;
  }

  if (previousScript === undefined && hasScript(node)) {
    registerScriptNode(scriptService, node);
  }
}

function destroySceneNode(
  node: Node,
  scriptService: ScriptServiceNode | undefined,
): void {
  for (const child of node.children.filter(isSceneNode)) {
    destroySceneNode(child, scriptService);
  }

  if (scriptService !== undefined && hasScript(node)) {
    destroyScriptNode(scriptService, node);
  }
}

function isSceneNode(node: Node): boolean {
  return !hasInputService(node) && !("network" in node) && !hasScriptService(node);
}
