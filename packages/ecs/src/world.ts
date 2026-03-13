import type { AnyComponent, Component, ComponentValue } from "./component";
import type { Entity } from "./entity";
import { Query, type QueryOptions } from "./query";
import type { Resource } from "./resource";

type ComponentStore = Map<Entity, unknown>;

export class World {
  #nextEntity: Entity;
  #entities: Set<Entity>;
  #components: Map<symbol, ComponentStore>;
  #resources: Map<symbol, unknown>;

  constructor() {
    this.#nextEntity = 1;
    this.#entities = new Set();
    this.#components = new Map();
    this.#resources = new Map();
  }

  get size(): number {
    return this.#entities.size;
  }

  spawn(...components: readonly ComponentValue<any>[]): Entity {
    const entity = this.spawnEmpty();
    this.insert(entity, ...components);
    return entity;
  }

  spawnEmpty(): Entity {
    const entity = this.#nextEntity;
    this.#nextEntity += 1;
    this.#entities.add(entity);
    return entity;
  }

  despawn(entity: Entity): void {
    if (!this.#entities.delete(entity)) {
      return;
    }

    for (const storage of this.#components.values()) {
      storage.delete(entity);
    }
  }

  insert(entity: Entity, ...components: readonly ComponentValue<any>[]): void {
    this.#assertEntityExists(entity);

    for (const component of components) {
      this.#getComponentStore(component.type).set(entity, component.value);
    }
  }

  remove(
    entity: Entity,
    ...components: readonly AnyComponent[]
  ): void {
    this.#assertEntityExists(entity);

    for (const component of components) {
      this.#components.get(component.key)?.delete(entity);
    }
  }

  get<T>(entity: Entity, component: Component<T>): T | undefined {
    if (!this.#entities.has(entity)) {
      return undefined;
    }

    return this.#components.get(component.key)?.get(entity) as T | undefined;
  }

  has<T>(entity: Entity, component: Component<T>): boolean {
    if (!this.#entities.has(entity)) {
      return false;
    }

    return this.#components.get(component.key)?.has(entity) ?? false;
  }

  hasEntity(entity: Entity): boolean {
    return this.#entities.has(entity);
  }

  *entities(): IterableIterator<Entity> {
    yield* this.#entities.values();
  }

  *entitiesWith(component: AnyComponent): IterableIterator<Entity> {
    const storage = this.#components.get(component.key);
    if (!storage) {
      return;
    }

    yield* storage.keys();
  }

  query<const TComponents extends readonly AnyComponent[]>(
    components: TComponents,
    options: QueryOptions = {},
  ): Query<TComponents> {
    return new Query(this, components, options);
  }

  setResource<T>(resource: Resource<T>, value: T): void {
    this.#resources.set(resource.key, value);
  }

  getResource<T>(resource: Resource<T>): T | undefined {
    return this.#resources.get(resource.key) as T | undefined;
  }

  hasResource<T>(resource: Resource<T>): boolean {
    return this.#resources.has(resource.key);
  }

  removeResource<T>(resource: Resource<T>): void {
    this.#resources.delete(resource.key);
  }

  #getComponentStore(component: AnyComponent): ComponentStore {
    let storage = this.#components.get(component.key);

    if (!storage) {
      storage = new Map();
      this.#components.set(component.key, storage);
    }

    return storage;
  }

  #assertEntityExists(entity: Entity): void {
    if (this.#entities.has(entity)) {
      return;
    }

    throw new Error(`Entity ${entity} does not exist.`);
  }
}
