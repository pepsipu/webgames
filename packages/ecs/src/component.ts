export type ComponentValue<T> = {
  readonly type: Component<T>;
  readonly value: T;
};

export type Component<T> = {
  readonly key: symbol;
  readonly debugName: string;
  (value: T): ComponentValue<T>;
};

export type AnyComponent = Component<any>;

export type ComponentData<TComponent extends AnyComponent> =
  TComponent extends Component<infer TValue> ? TValue : never;

export function component<T>(debugName: string): Component<T> {
  const type = ((value: T) => ({ type, value })) as Component<T>;

  Object.defineProperties(type, {
    key: { value: Symbol(debugName), enumerable: true },
    debugName: { value: debugName, enumerable: true },
  });

  return type;
}

export const defineComponent = component;
