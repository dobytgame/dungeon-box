export type CategoryTreeNode = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  children: CategoryTreeNode[];
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id?: string | null;
  parentId?: string | null;
};

function getParentId(row: CategoryRow): string | null {
  return row.parent_id ?? row.parentId ?? null;
}

export function buildCategoryTree(rows: CategoryRow[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>();

  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      slug: row.slug,
      name: row.name,
      parentId: getParentId(row),
      children: [],
    });
  }

  const roots: CategoryTreeNode[] = [];

  for (const node of Array.from(nodes.values())) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list: CategoryTreeNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    for (const child of list) sortNodes(child.children);
  };
  sortNodes(roots);

  return roots;
}

export function flattenCategoryTree(
  roots: CategoryTreeNode[],
  depth = 0
): Array<CategoryTreeNode & { depth: number }> {
  const flat: Array<CategoryTreeNode & { depth: number }> = [];

  for (const node of roots) {
    flat.push({ ...node, depth });
    flat.push(...flattenCategoryTree(node.children, depth + 1));
  }

  return flat;
}

export function collectDescendantCategoryIds(
  categoryId: string,
  rows: CategoryRow[]
): string[] {
  const childrenByParent = new Map<string, string[]>();

  for (const row of rows) {
    const parentId = getParentId(row);
    if (!parentId) continue;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(row.id);
    childrenByParent.set(parentId, siblings);
  }

  const ids = new Set<string>([categoryId]);
  const queue = [categoryId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (ids.has(childId)) continue;
      ids.add(childId);
      queue.push(childId);
    }
  }

  return Array.from(ids);
}
