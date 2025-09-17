'use client';

// Small helper to invalidate our localStorage cache used by useCachedConvexQuery
// Provide the same base key used when calling the hook and optionally an args object
export function invalidateCachedQuery(baseKey: string, args?: unknown) {
  try {
    if (!baseKey) return;
    if (args) {
      const key = `${baseKey}:${JSON.stringify(args)}`;
      localStorage.removeItem(key);
    } else {
      // Remove all entries starting with baseKey:
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(baseKey + ':')) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch {}
}

export function invalidateKeys(prefixes: string[]) {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (prefixes.some((p) => k.startsWith(p + ':'))) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
