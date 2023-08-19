/**
 * Difference returns a list of items that are in A but is not present in B.
 */
export const difference = <T>(a: Set<T>, b: Set<T>) =>
  new Set(Array.from(a).filter((x) => !b.has(x)));
