import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";
import type { Element } from "@webgame/engine";

export interface Scriptable<T extends Element = Element> {
  matches(element: Element): element is T;
  installElement?(
    context: QuickJSContext,
    elementHandle: QuickJSHandle,
    element: T,
  ): void;
}

const scriptables: Scriptable[] = [];

export function registerScriptable<T extends Element>(
  scriptable: Scriptable<T>,
): void {
  if (scriptables.includes(scriptable as Scriptable)) {
    return;
  }

  scriptables.push(scriptable as Scriptable);
}

export function getElementScriptables(element: Element): Scriptable[] {
  return scriptables.filter((scriptable) => scriptable.matches(element));
}

export function setScriptFunction(
  context: QuickJSContext,
  target: QuickJSHandle,
  name: string,
  fn: (this: QuickJSHandle, ...args: QuickJSHandle[]) => QuickJSHandle | void,
): void {
  const handle = context.newFunction(name, fn);

  try {
    context.setProp(target, name, handle);
  } finally {
    handle.dispose();
  }
}

export function setScriptGetter(
  context: QuickJSContext,
  target: QuickJSHandle,
  name: string,
  get: (this: QuickJSHandle) => QuickJSHandle,
): void {
  context.defineProp(target, name, {
    configurable: true,
    enumerable: true,
    get,
  });
}

export function dumpScriptValue(
  context: QuickJSContext,
  handle: QuickJSHandle | undefined,
): unknown {
  if (handle === undefined || context.typeof(handle) === "undefined") {
    return null;
  }

  return context.dump(handle);
}

export function createScriptValueHandle(
  context: QuickJSContext,
  value: unknown,
): QuickJSHandle {
  if (value === undefined) {
    return context.undefined;
  }

  if (value === null) {
    return context.null;
  }

  return context.unwrapResult(
    context.evalCode(`(${JSON.stringify(value)})`, "script-value.js"),
  );
}
