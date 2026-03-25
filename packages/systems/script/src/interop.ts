import {
  Element,
  getScriptBindings,
  type ScriptBinding,
} from "@webgames/engine";
import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";

export function createElementHandle(
  context: QuickJSContext,
  element: Element,
): QuickJSHandle {
  const handle = context.newObject();

  for (const binding of getScriptBindings(element)) {
    if (binding.kind === "property") {
      defineScriptProperty(context, handle, element, binding);
      continue;
    }

    defineScriptMethod(context, handle, element, binding);
  }

  return handle;
}

function defineScriptMethod(
  context: QuickJSContext,
  handle: QuickJSHandle,
  element: Element,
  binding: ScriptBinding,
): void {
  const functionHandle = context.newFunction(binding.name, (...args) => {
    const value = Reflect.apply(
      Reflect.get(element, binding.key, element) as (
        ...args: unknown[]
      ) => unknown,
      element,
      args.map((arg) => fromQuickJsValue(context, arg)),
    );

    return toQuickJsValue(context, value);
  });

  try {
    context.setProp(handle, binding.name, functionHandle);
  } finally {
    functionHandle.dispose();
  }
}

function defineScriptProperty(
  context: QuickJSContext,
  handle: QuickJSHandle,
  element: Element,
  binding: ScriptBinding,
): void {
  context.defineProp(handle, binding.name, {
    configurable: true,
    enumerable: true,
    get: binding.get
      ? () => {
          return toQuickJsValue(
            context,
            Reflect.get(element, binding.key, element),
          );
        }
      : undefined,
    // TODO: support read-only properties
    set: binding.set
      ? (value) => {
          Reflect.set(
            element,
            binding.key,
            fromQuickJsValue(context, value),
            element,
          );
        }
      : undefined,
  });
}

function createArrayHandle(
  context: QuickJSContext,
  values: readonly unknown[],
): QuickJSHandle {
  const handle = context.newArray();

  for (let index = 0; index < values.length; index += 1) {
    const valueHandle = toQuickJsValue(context, values[index]);

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
  value: Record<string, unknown>,
): QuickJSHandle {
  const handle = context.newObject();

  for (const [key, entry] of Object.entries(value)) {
    const valueHandle = toQuickJsValue(context, entry);

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
    return createElementHandle(context, value);
  }

  if (Array.isArray(value)) {
    return createArrayHandle(context, value);
  }

  return createObjectHandle(context, value as Record<string, unknown>);
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
