export function concatArray<T>(first: T[], second?: T[]) {
  return second ? first.concat(second) : first;
}

export function parseMetaString(meta: string): Record<string, string | boolean> {
  const variables = meta.split(" ");
  const result: Record<string, string | boolean> = {};
  for (const variable of variables) {
    if (variable.includes("=")) {
      const [key, value] = variable.split("=");
      result[key] = value;
    }
    else {
      result[variable] = true;
    }
  }
  return result;
}
