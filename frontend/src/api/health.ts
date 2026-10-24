export type Health = { status: string; database: string };

// Relative URL: Vite proxies /api in dev, nginx proxies it in prod.
export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const res = await fetch("/api/health/", { signal });
  const body = (await res.json().catch(() => null)) as Health | null;
  if (!body) throw new Error(`HTTP ${res.status}`);
  return body;
}
