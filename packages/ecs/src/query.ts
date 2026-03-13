import type { AnyComponent, ComponentData } from "./component";
import type { Entity } from "./entity";
import type { World } from "./world";

export type QueryOptions = {
  with?: readonly AnyComponent[];
  without?: readonly AnyComponent[];
};

export type QueryValues<TComponents extends readonly AnyComponent[]> = {
  [TIndex in keyof TComponents]: ComponentData<TComponents[TIndex]>;
};

export type QueryEntry<TComponents extends readonly AnyComponent[]> = [
  Entity,
  ...QueryValues<TComponents>,
];

export class Query<TComponents extends readonly AnyComponent[]>
  implements Iterable<QueryValues<TComponents>>
{
  #world: World;
  #components: TComponents;
  #with: readonly AnyComponent[];
  #without: readonly AnyComponent[];

  constructor(
    world: World,
    components: TComponents,
    options: QueryOptions = {},
  ) {
    this.#world = world;
    this.#components = components;
    this.#with = options.with ?? [];
    this.#without = options.without ?? [];
  }

  *[Symbol.iterator](): IterableIterator<QueryValues<TComponents>> {
    for (const [, ...values] of this.entities()) {
      yield values as QueryValues<TComponents>;
    }
  }

  *entities(): IterableIterator<QueryEntry<TComponents>> {
    for (const entity of this.#baseEntities()) {
      if (!this.#world.hasEntity(entity) || !this.#matchesFilters(entity)) {
        continue;
      }

      const values: unknown[] = [];
      let matches = true;

      for (const type of this.#components) {
        if (!this.#world.has(entity, type)) {
          matches = false;
          break;
        }

        values.push(this.#world.get(entity, type));
      }

      if (!matches) {
        continue;
      }

      yield [entity, ...values] as unknown as QueryEntry<TComponents>;
    }
  }

  *#baseEntities(): IterableIterator<Entity> {
    if (this.#components.length === 0) {
      yield* this.#world.entities();
      return;
    }

    yield* this.#world.entitiesWith(this.#components[0]);
  }

  #matchesFilters(entity: Entity): boolean {
    for (const type of this.#with) {
      if (!this.#world.has(entity, type)) {
        return false;
      }
    }

    for (const type of this.#without) {
      if (this.#world.has(entity, type)) {
        return false;
      }
    }

    return true;
  }
}
