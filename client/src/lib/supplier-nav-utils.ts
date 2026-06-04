/** Parse supplier category nav context from a shell pathname. */
export function parseSupplierNavPath(
  pathname: string,
  locale: string,
): { supplierId: string; categoryId: number | null } | null {
  const prefix = `/${locale}/suppliers/`;
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const rest = pathname.slice(prefix.length);
  const segments = rest.split("/").filter(Boolean);
  const supplierId = segments[0];
  if (!supplierId || !/^\d+$/.test(supplierId)) {
    return null;
  }

  if (segments.length === 1) {
    return { supplierId, categoryId: null };
  }

  if (
    segments[1] === "categories" &&
    segments[2] &&
    /^\d+$/.test(segments[2]) &&
    segments.length === 3
  ) {
    return { supplierId, categoryId: Number(segments[2]) };
  }

  return null;
}

type FlatCategory = { id: number; parent: number };

/** Category ids to expand so the active category is visible in the tree. */
export function expandedIdsForCategory(
  flat: FlatCategory[],
  categoryId: number | null,
): Set<number> {
  const ids = new Set<number>();
  if (categoryId == null) {
    return ids;
  }

  let cur = flat.find((c) => c.id === categoryId);
  while (cur && cur.parent !== 0) {
    ids.add(cur.parent);
    cur = flat.find((c) => c.id === cur!.parent);
  }
  return ids;
}
