import { Element } from "./element";

export function collectNamedElements(root: Element): Map<string, Element> {
  const namedElements = new Map<string, Element>();

  collectNamedChildren(root, namedElements);
  return namedElements;
}

function collectNamedChildren(
  parent: Element,
  namedElements: Map<string, Element>,
): void {
  for (const child of parent.children) {
    const name = child.name;

    if (name !== null) {
      if (namedElements.has(name)) {
        throw new Error(`Duplicate element name "${name}".`);
      }

      namedElements.set(name, child);
    }

    collectNamedChildren(child, namedElements);
  }
}
