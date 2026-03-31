import { Element } from "./element";

export function* walkElements(root: Element): Iterable<Element> {
  for (const child of root.children) {
    yield child;
    yield* walkElements(child);
  }
}
