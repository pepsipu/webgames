export interface Node {
  id?: string;
  parent: Node | null;
  children: Node[];
}

export function createNode<T extends object = {}>(
  properties: T = {} as T,
): Node & T {
  return {
    parent: null,
    children: [],
    ...properties,
  };
}

export function getRootNode(node: Node): Node {
  let root = node;

  while (root.parent !== null) {
    root = root.parent;
  }

  return root;
}

export function findNodeById(node: Node, id: string): Node | null {
  if (node.id === id) {
    return node;
  }

  for (const child of node.children) {
    const match = findNodeById(child, id);

    if (match !== null) {
      return match;
    }
  }

  return null;
}

export function detachNode(node: Node): void {
  if (node.parent === null) {
    return;
  }

  const siblings = node.parent.children;
  const index = siblings.indexOf(node);

  if (index === -1) {
    throw new Error("Node parent links are out of sync.");
  }

  siblings.splice(index, 1);
  node.parent = null;
}

export function setNodeParent(node: Node, parent: Node): void {
  if (node.parent === parent) {
    return;
  }

  for (
    let current: Node | null = parent;
    current !== null;
    current = current.parent
  ) {
    if (current === node) {
      throw new Error(
        "A node cannot be parented to itself or one of its children.",
      );
    }
  }

  detachNode(node);
  node.parent = parent;
  parent.children.push(node);
}
