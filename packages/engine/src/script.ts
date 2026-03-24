export interface ScriptBinding {
  kind: "method" | "property";
  name: string;
  key: string;
  get: boolean;
  set: boolean;
}

type ScriptMemberKind = "method" | "getter" | "setter";

type ScriptDecorator = (
  value: unknown,
  context:
    | ClassMethodDecoratorContext
    | ClassGetterDecoratorContext
    | ClassSetterDecoratorContext,
) => void;

const registeredBindings = new WeakMap<Function, Map<string, ScriptBinding>>();

export function script(name?: string): ScriptDecorator {
  return (_value, context) => {
    if (context.private || context.static) {
      throw new Error("Script members must decorate instance members.");
    }

    const key = getScriptKey(context.name);
    const kind = context.kind as ScriptMemberKind;

    context.addInitializer(function () {
      registerBinding(
        (this as { constructor: Function }).constructor,
        name ?? key,
        key,
        kind,
      );
    });
  };
}

export function getScriptBindings(value: object): readonly ScriptBinding[] {
  const bindings = new Map<string, ScriptBinding>();
  const prototypes: object[] = [];

  for (
    let prototype = Object.getPrototypeOf(value);
    prototype !== null && prototype !== Object.prototype;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    prototypes.unshift(prototype);
  }

  for (const prototype of prototypes) {
    const classBindings = registeredBindings.get(
      (prototype as { constructor: Function }).constructor,
    );

    if (classBindings === undefined) {
      continue;
    }

    for (const binding of classBindings.values()) {
      bindings.set(binding.name, binding);
    }
  }

  return [...bindings.values()];
}

function getClassBindings(constructor: Function): Map<string, ScriptBinding> {
  const existing = registeredBindings.get(constructor);

  if (existing !== undefined) {
    return existing;
  }

  const bindings = new Map<string, ScriptBinding>();

  registeredBindings.set(constructor, bindings);
  return bindings;
}

function registerBinding(
  constructor: Function,
  name: string,
  key: string,
  kind: ScriptMemberKind,
): void {
  const bindings = getClassBindings(constructor);
  const existing = bindings.get(name);

  if (kind === "method") {
    bindings.set(name, {
      kind: "method",
      name,
      key,
      get: false,
      set: false,
    });
    return;
  }

  const binding =
    existing === undefined || existing.kind === "method"
      ? {
          kind: "property" as const,
          name,
          key,
          get: false,
          set: false,
        }
      : existing;

  binding.get = binding.get || kind === "getter";
  binding.set = binding.set || kind === "setter";

  bindings.set(name, binding);
}

function getScriptKey(key: string | symbol): string {
  if (typeof key !== "string") {
    throw new Error("Script member names must be strings.");
  }

  return key;
}
