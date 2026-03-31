import type { ElementRegistry } from "./element-registry";
import { Element } from "./element";
import type { ElementSnapshot } from "./snapshot";

export class Document extends Element {
  static readonly tag: string = "game";
  static readonly scriptMethods: readonly string[] = ["createElement"];

  readonly #registry: ElementRegistry;

  constructor(registry: ElementRegistry) {
    super();
    this.#registry = registry;
  }

  createElement(snapshot: ElementSnapshot): void {
    this.append(this.#registry.create(snapshot));
  }
}
