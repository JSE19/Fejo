// Tiny deterministic hash for seeded visuals.
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function pick<T>(seed: string, arr: T[]): T {
  return arr[hashStr(seed) % arr.length];
}
