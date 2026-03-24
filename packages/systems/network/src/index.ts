import { Element } from "@webgames/engine";
import {
  CameraElement,
  type Material,
  type Mesh,
  ShapeElement,
  type Transform,
  TransformElement,
} from "@webgames/game";
import { InputServiceElement } from "@webgames/input";
import { ScriptElement } from "@webgames/script";
import { ButtonElement, ParagraphElement } from "@webgames/ui";

export interface ElementSnapshot extends Record<string, unknown> {
  children: ElementSnapshot[];
}

export function createElementSnapshot(root: Element): string {
  return JSON.stringify(snapshotElement(root));
}

export function applyElementSnapshot(
  root: Element,
  snapshot: ElementSnapshot,
): void {
  syncElement(root, snapshot);
}

function snapshotElement(element: Element): ElementSnapshot {
  const snapshot: ElementSnapshot = {
    children: element.children.filter(isReplicable).map(snapshotElement),
  };
  const source = element as unknown as Record<string, unknown>;

  if (element.name !== null) {
    snapshot.name = element.name;
  }

  for (const [key, value] of Object.entries(source)) {
    snapshot[key] = value;
  }

  return snapshot;
}

function syncElement(element: Element, snapshot: ElementSnapshot): void {
  syncElementProperties(element, snapshot);
  syncChildren(element, snapshot.children);
}

function syncElementProperties(
  element: Element,
  snapshot: ElementSnapshot,
): void {
  const target = element as unknown as Record<string, unknown>;

  element.name = typeof snapshot.name === "string" ? snapshot.name : null;

  for (const key of Object.keys(target)) {
    if (!(key in snapshot)) {
      delete target[key];
    }
  }

  for (const [key, value] of Object.entries(snapshot)) {
    if (key === "children" || key === "name") {
      continue;
    }

    target[key] = value;
  }
}

function syncChildren(parent: Element, snapshots: ElementSnapshot[]): void {
  const children = parent.children.filter(isReplicable);

  for (let index = 0; index < snapshots.length; index += 1) {
    const snapshot = snapshots[index];
    const child = children[index];

    if (child === undefined) {
      const nextChild = createElementForSnapshot(snapshot);

      parent.append(nextChild);
      syncElement(nextChild, snapshot);
      continue;
    }

    if (!canSyncElement(child, snapshot)) {
      const replacement = createElementForSnapshot(snapshot);

      parent.moveBefore(replacement, child);
      syncElement(replacement, snapshot);
      child.remove();
      continue;
    }

    syncElement(child, snapshot);
  }

  for (let index = snapshots.length; index < children.length; index += 1) {
    children[index].remove();
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
    case "script":
      return new ScriptElement(
        snapshot.source as string,
        snapshot.tickBudgetMs as number,
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
    case "script":
      return element instanceof ScriptElement;
    case "transform":
      return element instanceof TransformElement;
    default:
      return element.constructor === Element;
  }
}

function getElementKind(
  snapshot: ElementSnapshot,
): "button" | "camera" | "p" | "shape" | "script" | "transform" | "element" {
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

  if ("source" in snapshot && "tickBudgetMs" in snapshot) {
    return "script";
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
    !("clients" in element)
  );
}
