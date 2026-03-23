import { Element } from "./element";

export class Document extends Element {
  getElementById(id: string): Element | null {
    return findElementById(this.children, id);
  }
}

function findElementById(
  children: readonly Element[],
  id: string,
): Element | null {
  for (const child of children) {
    if (child.id === id) {
      return child;
    }

    const match = findElementById(child.children, id);

    if (match !== null) {
      return match;
    }
  }

  return null;
}
