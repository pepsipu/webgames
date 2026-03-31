import { selectAll, selectOne } from "css-select";
import { Element } from "./element";

type ElementQuery<T extends Element = Element> =
  | string
  | ((element: Element) => element is T)
  | ((element: Element) => boolean);

const queryOptions = {
  adapter: {
    isTag(node: Element): node is Element {
      return node instanceof Element;
    },
    getAttributeValue(element: Element, name: string): string | undefined {
      return getAttributeValue(element, name);
    },
    getChildren(node: Element): Element[] {
      return node.children as Element[];
    },
    getName(element: Element): string {
      return getElementTag(element);
    },
    getParent(node: Element): Element | null {
      return node.parent;
    },
    getSiblings(node: Element): Element[] {
      return node.parent === null
        ? [node]
        : (node.parent.children as Element[]);
    },
    prevElementSibling(node: Element): Element | null {
      const siblings = node.parent?.children ?? [node];
      const index = siblings.indexOf(node);

      return index > 0 ? siblings[index - 1] : null;
    },
    getText(node: Element): string {
      return getText(node);
    },
    hasAttrib(element: Element, name: string): boolean {
      return getAttributeValue(element, name) !== undefined;
    },
    removeSubsets(nodes: Element[]): Element[] {
      const uniqueNodes: Element[] = [];
      const nodeSet = new Set<Element>();

      for (const node of nodes) {
        if (nodeSet.has(node)) {
          continue;
        }

        nodeSet.add(node);
        uniqueNodes.push(node);
      }

      return uniqueNodes.filter((node) => {
        for (
          let parent = node.parent;
          parent !== null;
          parent = parent.parent
        ) {
          if (nodeSet.has(parent)) {
            return false;
          }
        }

        return true;
      });
    },
  },
  cacheResults: false,
  xmlMode: true,
} as const;

export function selectElements<T extends Element = Element>(
  root: Element,
  query: ElementQuery<T>,
): T[] {
  return selectAll<Element, Element>(
    query as string | ((element: Element) => boolean),
    root,
    queryOptions,
  ) as T[];
}

export function selectElement<T extends Element = Element>(
  root: Element,
  query: ElementQuery<T>,
): T | null {
  return selectOne<Element, Element>(
    query as string | ((element: Element) => boolean),
    root,
    queryOptions,
  ) as T | null;
}

function getElementTag(element: Element): string {
  return (Object.getPrototypeOf(element) as { constructor: { tag: string } })
    .constructor.tag;
}

function getAttributeValue(element: Element, name: string): string | undefined {
  if (name === "id") {
    return element.id ?? undefined;
  }

  if (name === "class") {
    return element.classes.length === 0 ? undefined : element.classes.join(" ");
  }

  return toAttributeValue(Reflect.get(element, name, element));
}

function getText(node: Element): string {
  const text = Reflect.get(node, "text", node);
  const ownText = typeof text === "string" ? text : "";

  return ownText + node.children.map((child) => getText(child)).join("");
}

function toAttributeValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(" ");
  }

  return undefined;
}
