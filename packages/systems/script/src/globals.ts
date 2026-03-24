import type { Element } from "@webgames/engine";
import { createElementHandle } from "./interop";
import type { QuickJSContext } from "./module";

const reservedGlobalNames = new Set(["document", "tick"]);

export function installScriptGlobals(
  context: QuickJSContext,
  document: Element,
): void {
  installNamedGlobal(context, "document", document);

  const namedElements = new Map<string, Element>();
  collectNamedElements(document, namedElements);

  for (const [name, element] of namedElements) {
    installNamedGlobal(context, name, element);
  }
}

function collectNamedElements(
  element: Element,
  namedElements: Map<string, Element>,
): void {
  for (const child of element.children) {
    const name = child.name;

    if (name !== null) {
      if (reservedGlobalNames.has(name)) {
        throw new Error(`Element name "${name}" is reserved in scripts.`);
      }

      if (namedElements.has(name)) {
        throw new Error(`Duplicate element name "${name}".`);
      }

      namedElements.set(name, child);
    }

    collectNamedElements(child, namedElements);
  }
}

function installNamedGlobal(
  context: QuickJSContext,
  name: string,
  element: Element,
): void {
  assertGlobalNameAvailable(context, name);

  const handle = createElementHandle(context, element);

  try {
    context.setProp(context.global, name, handle);
  } finally {
    handle.dispose();
  }
}

function assertGlobalNameAvailable(
  context: QuickJSContext,
  name: string,
): void {
  const existing = context.getProp(context.global, name);

  try {
    if (context.typeof(existing) !== "undefined") {
      throw new Error(`Element name "${name}" conflicts with a script global.`);
    }
  } finally {
    existing.dispose();
  }
}
