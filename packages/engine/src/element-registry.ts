import { Element } from "./element";
import type { ElementSnapshot } from "./snapshot";

export interface ElementField<T extends Element = Element> {
  get?(element: T): unknown;
  set(element: T, value: unknown): void;
}

export type ElementFields<T extends Element = Element> = Readonly<
  Record<string, ElementField<T>>
>;

export type ElementType<T extends Element = Element> = (new (
  ...args: any[]
) => T) & {
  readonly tag?: string;
  readonly fields?: ElementFields<any>;
  readonly replicated?: boolean;
  readonly scriptMethods?: readonly string[];
  readonly scriptProperties?: readonly string[];
  readonly readonlyScriptProperties?: readonly string[];
};

export interface ScriptBindings {
  methods: readonly string[];
  properties: readonly string[];
  readonlyProperties: readonly string[];
}

export class ElementRegistry {
  readonly #typesByTag = new Map<string, ElementType>();

  register(...types: ElementType[]): void {
    for (const type of types) {
      const tag = getOwnTag(type);

      if (tag === undefined) {
        throw new Error(`Element class "${type.name}" is missing a tag.`);
      }

      const existing = this.#typesByTag.get(tag);

      if (existing !== undefined) {
        throw new Error(`Element tag "${tag}" is already registered.`);
      }

      this.#typesByTag.set(tag, type);
    }
  }

  create(snapshot: ElementSnapshot): Element {
    const type = this.#requireType(snapshot.tag);
    const element = new (type as unknown as new () => Element)();

    this.#syncElement(element, type, snapshot);
    return element;
  }

  getSnapshot(element: Element): ElementSnapshot {
    const type = getElementType(element);
    const tag = this.#requireTag(type);
    const snapshot: ElementSnapshot = {
      tag,
      id: element.id,
      class: [...element.classes],
      children: element.children
        .filter((child) => this.#isReplicated(child))
        .map((child) => this.getSnapshot(child)),
    };

    this.#forEachField(type, (key, field) => {
      snapshot[key] =
        field.get?.(element as never) ?? Reflect.get(element, key, element);
    });

    return snapshot;
  }

  applySnapshot(element: Element, snapshot: ElementSnapshot): void {
    const type = getElementType(element);

    if (this.#requireTag(type) !== snapshot.tag) {
      throw new Error(
        `Cannot apply <${snapshot.tag}> snapshot to ${element.constructor.name}.`,
      );
    }

    this.#syncElement(element, type, snapshot);
  }

  getScriptBindings(element: Element): ScriptBindings {
    const methods = new Set<string>();
    const properties = new Set<string>();
    const readonlyProperties = new Set<string>();

    for (const type of getElementTypeChain(getElementType(element))) {
      if (Object.hasOwn(type, "scriptMethods")) {
        for (const method of type.scriptMethods ?? []) {
          methods.add(method);
        }
      }

      if (Object.hasOwn(type, "scriptProperties")) {
        for (const property of type.scriptProperties ?? []) {
          properties.add(property);
          readonlyProperties.delete(property);
        }
      }

      if (Object.hasOwn(type, "readonlyScriptProperties")) {
        for (const property of type.readonlyScriptProperties ?? []) {
          properties.delete(property);
          readonlyProperties.add(property);
        }
      }
    }

    return {
      methods: [...methods],
      properties: [...properties],
      readonlyProperties: [...readonlyProperties],
    };
  }

  #syncChildren(parent: Element, snapshots: ElementSnapshot[]): void {
    const children = parent.children.filter((child) =>
      this.#isReplicated(child),
    );

    for (let index = 0; index < snapshots.length; index += 1) {
      const snapshot = snapshots[index];
      const child = children[index];

      if (child === undefined) {
        parent.append(this.create(snapshot));
        continue;
      }

      const childType = getElementType(child);

      if (this.#requireTag(childType) !== snapshot.tag) {
        const replacement = this.create(snapshot);

        parent.moveBefore(replacement, child);
        child.remove();
        continue;
      }

      this.#syncElement(child, childType, snapshot);
    }

    for (let index = snapshots.length; index < children.length; index += 1) {
      children[index].remove();
    }
  }

  #syncElement(
    element: Element,
    type: ElementType,
    snapshot: ElementSnapshot,
  ): void {
    element.id = snapshot.id ?? null;
    element.classes = snapshot.class ?? [];

    this.#forEachField(type, (key, field) => {
      if (key in snapshot) {
        field.set(element as never, snapshot[key] as never);
      }
    });

    this.#syncChildren(element, snapshot.children ?? []);
  }

  #isReplicated(element: Element): boolean {
    const type = getElementType(element);

    this.#requireTag(type);
    return type.replicated !== false;
  }

  #forEachField(
    type: ElementType,
    callback: (key: string, field: ElementField) => void,
  ): void {
    for (const current of getElementTypeChain(type)) {
      if (!Object.hasOwn(current, "fields")) {
        continue;
      }

      for (const [key, field] of Object.entries(current.fields ?? {})) {
        callback(key, field);
      }
    }
  }

  #requireTag(type: ElementType): string {
    const tag = getOwnTag(type);

    if (tag !== undefined && this.#typesByTag.get(tag) === type) {
      return tag;
    }

    throw new Error(`Element class "${type.name}" is not registered.`);
  }

  #requireType(tag: string): ElementType {
    const type = this.#typesByTag.get(tag);

    if (type === undefined) {
      throw new Error(`Element tag "${tag}" is not registered.`);
    }

    return type;
  }
}

function getOwnTag(type: ElementType): string | undefined {
  return Object.hasOwn(type, "tag") ? type.tag : undefined;
}

function getElementType(value: object): ElementType {
  return (Object.getPrototypeOf(value) as { constructor: ElementType })
    .constructor;
}

function getElementTypeChain(type: ElementType): ElementType[] {
  const types: ElementType[] = [];

  for (
    let current: object | null = type;
    current !== null && current !== Function.prototype;
    current = Object.getPrototypeOf(current)
  ) {
    types.unshift(current as ElementType);
  }

  return types;
}
