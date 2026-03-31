import { Element, type ElementRegistry } from "@webgames/engine";
import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";

export function createElementHandle(
  context: QuickJSContext,
  registry: ElementRegistry,
  element: Element,
): QuickJSHandle {
  const handle = context.newObject();
  const bindings = registry.getScriptBindings(element);

  for (const method of bindings.methods) {
    defineScriptMethod(context, registry, handle, element, method);
  }

  for (const property of bindings.properties) {
    defineScriptProperty(context, registry, handle, element, property, false);
  }

  for (const property of bindings.readonlyProperties) {
    defineScriptProperty(context, registry, handle, element, property, true);
  }

  return handle;
}

function defineScriptMethod(
  context: QuickJSContext,
  registry: ElementRegistry,
  handle: QuickJSHandle,
  element: Element,
  key: string,
): void {
  const functionHandle = context.newFunction(key, (...args) => {
    const value = Reflect.apply(
      Reflect.get(element, key, element) as (...args: unknown[]) => unknown,
      element,
      args.map((arg) => fromQuickJsValue(context, arg)),
    );

    return toQuickJsValue(context, registry, value);
  });

  try {
    context.setProp(handle, key, functionHandle);
  } finally {
    functionHandle.dispose();
  }
}

function defineScriptProperty(
  context: QuickJSContext,
  registry: ElementRegistry,
  handle: QuickJSHandle,
  element: Element,
  key: string,
  readonly: boolean,
): void {
  context.defineProp(handle, key, {
    configurable: true,
    enumerable: true,
    get: () => {
      return toQuickJsValue(
        context,
        registry,
        Reflect.get(element, key, element),
      );
    },
    set: readonly
      ? undefined
      : (value) => {
          Reflect.set(element, key, fromQuickJsValue(context, value), element);
        },
  });
}

function createArrayHandle(
  context: QuickJSContext,
  registry: ElementRegistry,
  values: readonly unknown[],
): QuickJSHandle {
  const handle = context.newArray();

  for (let index = 0; index < values.length; index += 1) {
    const valueHandle = toQuickJsValue(context, registry, values[index]);

    try {
      context.setProp(handle, index, valueHandle);
    } finally {
      if (
        valueHandle !== context.undefined &&
        valueHandle !== context.null &&
        valueHandle !== context.true &&
        valueHandle !== context.false
      ) {
        valueHandle.dispose();
      }
    }
  }

  return handle;
}

function createObjectHandle(
  context: QuickJSContext,
  registry: ElementRegistry,
  value: Record<string, unknown>,
): QuickJSHandle {
  const handle = context.newObject();

  for (const [key, entry] of Object.entries(value)) {
    const valueHandle = toQuickJsValue(context, registry, entry);

    try {
      context.setProp(handle, key, valueHandle);
    } finally {
      if (
        valueHandle !== context.undefined &&
        valueHandle !== context.null &&
        valueHandle !== context.true &&
        valueHandle !== context.false
      ) {
        valueHandle.dispose();
      }
    }
  }

  return handle;
}

function toQuickJsValue(
  context: QuickJSContext,
  registry: ElementRegistry,
  value: unknown,
): QuickJSHandle {
  if (value === undefined) {
    return context.undefined;
  }

  if (value === null) {
    return context.null;
  }

  if (value === true) {
    return context.true;
  }

  if (value === false) {
    return context.false;
  }

  if (typeof value === "number") {
    return context.newNumber(value);
  }

  if (typeof value === "string") {
    return context.newString(value);
  }

  if (value instanceof Element) {
    return createElementHandle(context, registry, value);
  }

  if (Array.isArray(value)) {
    return createArrayHandle(context, registry, value);
  }

  return createObjectHandle(
    context,
    registry,
    value as Record<string, unknown>,
  );
}

function fromQuickJsValue(
  context: QuickJSContext,
  value: QuickJSHandle,
): unknown {
  switch (context.typeof(value)) {
    case "undefined":
      return undefined;
    case "number":
      return context.getNumber(value);
    case "string":
      return context.getString(value);
    default:
      return context.dump(value);
  }
}
