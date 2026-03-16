import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";

export function setFunction(
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

export function setGetter(
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
