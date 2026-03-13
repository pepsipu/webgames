export type Resource<T> = {
  readonly key: symbol;
  readonly debugName: string;
};

export type AnyResource = Resource<any>;

export type ResourceData<TResource extends AnyResource> =
  TResource extends Resource<infer TValue> ? TValue : never;

export function resource<T>(debugName: string): Resource<T> {
  return Object.freeze({
    key: Symbol(debugName),
    debugName,
  });
}

export const defineResource = resource;
