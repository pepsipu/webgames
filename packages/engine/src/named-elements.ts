import { Element } from "./element";
import { walkElements } from "./walk-elements";

export function collectNamedElements(root: Element): Map<string, Element> {
  const namedElements = new Map<string, Element>();

  for (const element of walkElements(root)) {
    const name = element.name;

    if (name !== null) {
      if (namedElements.has(name)) {
        throw new Error(`Duplicate element name "${name}".`);
      }

      namedElements.set(name, element);
    }
  }

  return namedElements;
}
