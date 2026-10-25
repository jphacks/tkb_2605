// Preview-only, undirected relationships. Replace with server state when the API is available.
const relationships = new Set<string>();
const listeners = new Set<() => void>();

function pairKey(firstId: string, secondId: string): string | null {
  if (!firstId.trim() || !secondId.trim() || firstId === secondId) return null;
  return JSON.stringify([firstId, secondId].sort());
}

export function arePreviewMasmates(firstId: string, secondId: string): boolean {
  const key = pairKey(firstId, secondId);
  return key !== null && relationships.has(key);
}

export function becomePreviewMasmates(firstId: string, secondId: string): void {
  const key = pairKey(firstId, secondId);
  if (key === null || relationships.has(key)) return;
  relationships.add(key);
  listeners.forEach((listener) => listener());
}

export function subscribePreviewMasmates(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
