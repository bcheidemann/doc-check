export function concatArray<T>(first: T[], second?: T[]) {
  return second ? first.concat(second) : first;
}
