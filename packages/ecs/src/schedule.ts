import type { World } from "./world";

export type System = (world: World) => void;

export class Schedule {
  #systems: System[];

  constructor(...systems: System[]) {
    this.#systems = [...systems];
  }

  addSystems(...systems: System[]): this {
    this.#systems.push(...systems);
    return this;
  }

  run(world: World): void {
    for (const system of this.#systems) {
      system(world);
    }
  }
}
