export const difference = <T>(a: Set<T>, b: Set<T>) =>
  new Set(Array.from(a).filter((x) => !b.has(x)));
