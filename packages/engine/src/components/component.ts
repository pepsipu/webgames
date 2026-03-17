import type { Node } from "../node";

export interface ComponentType<
  Key extends string = string,
  TComponent extends Component = Component,
> {
  readonly key: Key;
  new (...args: any[]): TComponent;
}

type ComponentProps<TTypes extends ComponentType | readonly ComponentType[]> = {
  [TType in (
    TTypes extends readonly ComponentType[] ? TTypes[number] : TTypes
  ) as TType["key"]]: InstanceType<TType>;
};

export type NodeWith<TTypes extends ComponentType | readonly ComponentType[]> =
  Node &
  ComponentProps<TTypes>;

const componentNodes = new Map<ComponentType, Set<Node>>();

export abstract class Component {}

export function addComponent<T extends Node>(
  node: T,
  component: Component,
): T {
  const type = component.constructor as ComponentType;
  const key = type.key;
  const properties = node as unknown as Record<string, unknown>;

  if (properties[key] !== undefined) {
    throw new Error(`Node property "${key}" is already in use.`);
  }

  properties[key] = component;
  getComponentNodes(type).add(node);

  return node;
}

export function getComponent<TType extends ComponentType>(
  node: Node,
  type: TType,
): InstanceType<TType> | null {
  const properties = node as unknown as Record<string, unknown>;
  const current = properties[type.key];

  return current instanceof type ? current as InstanceType<TType> : null;
}

export function removeComponent<TType extends ComponentType>(
  node: Node,
  type: TType,
): void {
  const properties = node as unknown as Record<string, unknown>;
  const current = properties[type.key];

  if (!(current instanceof type)) {
    return;
  }

  delete properties[type.key];
  getComponentNodes(type).delete(node);
}

export function queryNodes<
  TNode extends Node = Node,
  TType extends ComponentType = ComponentType,
>(
  type: TType,
): ReadonlySet<TNode & NodeWith<TType>> {
  return getComponentNodes(type) as unknown as ReadonlySet<TNode & NodeWith<TType>>;
}

function getComponentNodes(type: ComponentType): Set<Node> {
  let nodes = componentNodes.get(type);

  if (!nodes) {
    nodes = new Set();
    componentNodes.set(type, nodes);
  }

  return nodes;
}
