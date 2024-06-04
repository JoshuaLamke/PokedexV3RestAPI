
export const mapper = <TData extends Record<string, unknown>>(
  rename: {[K in keyof TData]?: string} = {},
  omit: Array<keyof TData> = [] 
) => (data: TData) => {
  // Rename: give newKey the oldKey value, then delete oldKey
  for (const [oldKey, newKey] of Object.entries(rename)) {
    if (!(oldKey in data) || !newKey) {
      continue;
    }
    (data as Record<string, unknown>)[newKey] = data[oldKey];
    delete data[oldKey];
  }

  // Omit: delete omitted keys
  for (const omitKey of omit) {
    delete data[omitKey];
  }

  return data as Record<string, unknown>;
}