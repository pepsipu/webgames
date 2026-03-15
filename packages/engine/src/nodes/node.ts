export interface Node {
  parent: Node | null;
  children: Node[];
}

export interface NodeOptions {
  parent?: Node;
}

export function createNode(): Node {
  return {
    parent: null,
    children: [],
  };
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

  if (node.parent !== null) {
    const siblings = node.parent.children;
    const index = siblings.indexOf(node);

    if (index === -1) {
      throw new Error("Node parent links are out of sync.");
    }

    siblings.splice(index, 1);
  }

  node.parent = parent;
  parent.children.push(node);
}
