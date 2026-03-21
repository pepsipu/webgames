import { createElement, type Element } from "@webgame/engine";
import { hasInputService } from "@webgame/input";
import {
  destroyScriptElement,
  hasScript,
  hasScriptService,
  registerScriptElement,
  type ScriptComponent,
  type ScriptServiceElement,
} from "@webgame/script";

export interface ElementSnapshot extends Record<string, unknown> {
  children: ElementSnapshot[];
}

export function createElementSnapshot(root: Element): string {
  return JSON.stringify(snapshotElement(root));
}

export function applyElementSnapshot(
  root: Element,
  snapshot: ElementSnapshot,
  scriptService: ScriptServiceElement | undefined,
): void {
  syncElement(root, snapshot, scriptService);
}

function snapshotElement(element: Element): ElementSnapshot {
  const snapshot: ElementSnapshot = {
    children: element.children.filter(isReplicable).map(snapshotElement),
  };
  const source = element as unknown as Record<string, unknown>;

  if (element.id !== null) {
    snapshot.id = element.id;
  }

  for (const [key, value] of Object.entries(source)) {
    snapshot[key] = value;
  }

  return snapshot;
}

function syncElement(
  element: Element,
  snapshot: ElementSnapshot,
  scriptService: ScriptServiceElement | undefined,
): void {
  const previousScript = hasScript(element) ? element : undefined;

  syncElementProperties(element, snapshot);
  syncChildren(element, snapshot.children, scriptService);
  syncElementScript(element, scriptService, previousScript);
}

function syncElementProperties(
  element: Element,
  snapshot: ElementSnapshot,
): void {
  const target = element as unknown as Record<string, unknown>;

  element.id = typeof snapshot.id === "string" ? snapshot.id : null;

  for (const key of Object.keys(target)) {
    if (!(key in snapshot)) {
      delete target[key];
    }
  }

  for (const [key, value] of Object.entries(snapshot)) {
    if (key === "children" || key === "id") {
      continue;
    }

    target[key] = value;
  }
}

function syncChildren(
  parent: Element,
  snapshots: ElementSnapshot[],
  scriptService: ScriptServiceElement | undefined,
): void {
  const children = parent.children.filter(isReplicable);

  for (let index = 0; index < snapshots.length; index += 1) {
    const child = children[index];

    if (child === undefined) {
      const nextChild = createElement();

      parent.append(nextChild);
      syncElement(nextChild, snapshots[index], scriptService);
      continue;
    }

    syncElement(child, snapshots[index], scriptService);
  }

  for (let index = snapshots.length; index < children.length; index += 1) {
    destroyDocumentElement(children[index], scriptService);
    children[index].remove();
  }
}

function syncElementScript(
  element: Element,
  scriptService: ScriptServiceElement | undefined,
  previousScript: (Element & ScriptComponent) | undefined,
): void {
  if (scriptService === undefined) {
    return;
  }

  if (previousScript !== undefined && !hasScript(element)) {
    destroyScriptElement(scriptService, previousScript);
    return;
  }

  if (previousScript === undefined && hasScript(element)) {
    registerScriptElement(scriptService, element);
  }
}

function destroyDocumentElement(
  element: Element,
  scriptService: ScriptServiceElement | undefined,
): void {
  for (const child of element.children.filter(isReplicable)) {
    destroyDocumentElement(child, scriptService);
  }

  if (scriptService !== undefined && hasScript(element)) {
    destroyScriptElement(scriptService, element);
  }
}

function isReplicable(element: Element): boolean {
  return (
    !hasInputService(element) &&
    !("network" in element) &&
    !hasScriptService(element)
  );
}
