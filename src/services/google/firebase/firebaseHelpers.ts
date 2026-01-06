export function stringifyData(data?: Record<string, any>): Record<string, string> {
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])
  );
}

export function chunkArray<T>(arr: T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
