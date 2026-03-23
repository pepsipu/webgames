import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import { Document, Element } from "@webgame/engine";
import {
  createScriptValueHandle,
  getElementScriptables,
  setScriptFunction,
  setScriptGetter,
} from "../scriptable";

export function createDocumentHandle(
  context: QuickJSContext,
  document: Document,
): QuickJSHandle {
  const documentHandle = createElementHandle(context, document);

  setScriptFunction(context, documentHandle, "getElementById", (id) => {
    return createNullableElementHandle(
      context,
      document.getElementById(context.getString(id)),
    );
  });

  return documentHandle;
}

export function createElementHandle(
  context: QuickJSContext,
  element: Element,
): QuickJSHandle {
  const elementHandle = context.newObject();

  setScriptGetter(context, elementHandle, "id", () => {
    return createScriptValueHandle(context, element.id);
  });
  setScriptGetter(context, elementHandle, "parent", () => {
    return createNullableParentHandle(context, element.parent);
  });
  setParentHandleProperties(context, elementHandle, element);
  setScriptFunction(context, elementHandle, "remove", () => {
    element.remove();
  });

  for (const scriptable of getElementScriptables(element)) {
    scriptable.installElement?.(context, elementHandle, element);
  }

  return elementHandle;
}

export function createNullableElementHandle(
  context: QuickJSContext,
  element: Element | null,
): QuickJSHandle {
  if (element === null) {
    return context.null;
  }

  return createElementHandle(context, element);
}

function createChildrenHandle(
  context: QuickJSContext,
  children: readonly Element[],
): QuickJSHandle {
  const childrenHandle = context.newArray();

  for (let index = 0; index < children.length; index += 1) {
    const childHandle = createElementHandle(context, children[index]);

    try {
      context.setProp(childrenHandle, index, childHandle);
    } finally {
      childHandle.dispose();
    }
  }

  return childrenHandle;
}

function setParentHandleProperties(
  context: QuickJSContext,
  handle: QuickJSHandle,
  parent: Element,
): void {
  setScriptGetter(context, handle, "children", () => {
    return createChildrenHandle(context, parent.children);
  });
  setScriptGetter(context, handle, "childElementCount", () => {
    return context.newNumber(parent.childElementCount);
  });
  setScriptGetter(context, handle, "firstElementChild", () => {
    return createNullableElementHandle(context, parent.firstElementChild);
  });
  setScriptGetter(context, handle, "lastElementChild", () => {
    return createNullableElementHandle(context, parent.lastElementChild);
  });
}

function createNullableParentHandle(
  context: QuickJSContext,
  parent: Element | null,
): QuickJSHandle {
  if (parent === null) {
    return context.null;
  }

  return createElementHandle(context, parent);
}
