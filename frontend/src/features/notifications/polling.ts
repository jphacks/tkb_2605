export const NOTIFICATION_POLL_MS = 1_000;
type PollHost = {
  available(): boolean;
  onWake(callback: () => void): () => void;
  schedule(callback: () => void, delay: number): () => void;
};
export function startNotificationPolling(refresh: () => Promise<void>, host: PollHost) {
  let stopped = false;
  let pending = false;
  let cancelTimer: (() => void) | undefined;
  async function wake() {
    cancelTimer?.(); cancelTimer = undefined;
    if (stopped || pending || !host.available()) return;
    pending = true;
    try { await refresh(); }
    finally {
      pending = false;
      if (!stopped && host.available()) cancelTimer = host.schedule(() => { void wake(); }, NOTIFICATION_POLL_MS);
    }
  }
  const unlisten = host.onWake(() => { void wake(); });
  void wake();
  return () => { stopped = true; cancelTimer?.(); unlisten(); };
}
