import { Element } from "@webgame/engine";
import {
  CameraElement,
  type Material,
  type Mesh,
  ShapeElement,
  type Transform,
  TransformElement,
} from "@webgame/game";
import { InputServiceElement } from "@webgame/input";
import {
  destroyScriptElement,
  hasScript,
  hasScriptService,
  registerScriptElement,
  type ScriptComponent,
  type ScriptServiceElement,
} from "@webgame/script";
import { ButtonElement, ParagraphElement } from "@webgame/ui";

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
    const snapshot = snapshots[index];
    const child = children[index];

    if (child === undefined) {
      const nextChild = createElementForSnapshot(snapshot);

      parent.append(nextChild);
      syncElement(nextChild, snapshot, scriptService);
      continue;
    }

    if (!canSyncElement(child, snapshot)) {
      const replacement = createElementForSnapshot(snapshot);

      parent.moveBefore(replacement, child);
      syncElement(replacement, snapshot, scriptService);
      destroyDocumentElement(child, scriptService);
      child.remove();
      continue;
    }

    syncElement(child, snapshot, scriptService);
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

function createElementForSnapshot(snapshot: ElementSnapshot): Element {
  switch (getElementKind(snapshot)) {
    case "button":
      return new ButtonElement((snapshot.text as string | undefined) ?? "");
    case "camera":
      return new CameraElement({
        transform: snapshot.transform as Transform,
        fovY: snapshot.fovY as number,
        near: snapshot.near as number,
        far: snapshot.far as number,
      });
    case "p":
      return new ParagraphElement((snapshot.text as string | undefined) ?? "");
    case "shape":
      return new ShapeElement(
        snapshot.transform as Transform,
        snapshot.mesh as Mesh,
        snapshot.material as Material,
      );
    case "transform":
      return new TransformElement(snapshot.transform as Transform);
    default:
      return new Element();
  }
}

function canSyncElement(element: Element, snapshot: ElementSnapshot): boolean {
  switch (getElementKind(snapshot)) {
    case "button":
      return element instanceof ButtonElement;
    case "camera":
      return element instanceof CameraElement;
    case "p":
      return element instanceof ParagraphElement;
    case "shape":
      return element instanceof ShapeElement;
    case "transform":
      return element instanceof TransformElement;
    default:
      return element.constructor === Element;
  }
}

function getElementKind(
  snapshot: ElementSnapshot,
): "button" | "camera" | "p" | "shape" | "transform" | "element" {
  if (snapshot.uiType === "button") {
    return "button";
  }

  if (snapshot.uiType === "p") {
    return "p";
  }

  if ("fovY" in snapshot) {
    return "camera";
  }

  if ("mesh" in snapshot) {
    return "shape";
  }

  if ("transform" in snapshot) {
    return "transform";
  }

  return "element";
}

function isReplicable(element: Element): boolean {
  return (
    !(element instanceof InputServiceElement) &&
    !("socket" in element) &&
    !("clients" in element) &&
    !hasScriptService(element)
  );
}
