import { collectNamedElements, type Element } from "@webgames/engine";
import type { QuickJSContext } from "quickjs-emscripten-core";
import { createElementHandle } from "./interop";

const reservedGlobalNames = new Set(["document", "tick"]);

export function installScriptGlobals(
  context: QuickJSContext,
  document: Element,
): void {
  installNamedGlobal(context, "document", document);

  const namedElements = collectNamedElements(document);

  for (const [name, element] of namedElements) {
    if (reservedGlobalNames.has(name)) {
      throw new Error(`Element name "${name}" is reserved in scripts.`);
    }

    installNamedGlobal(context, name, element);
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
