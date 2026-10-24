// Only requests in flight are remembered. This is not an autosave of unfinished input.
const prefix = "workout.operation.v1:";

export function readOperation(key: string): unknown | null {
  try {
    const value = sessionStorage.getItem(prefix + key);
    return value === null ? null : JSON.parse(value) as unknown;
  } catch {
    throw new Error("送信状態を読み込めません。ブラウザの保存設定を確認してください。");
  }
}

export function writeOperation(key: string, value: unknown): void {
  try { sessionStorage.setItem(prefix + key, JSON.stringify(value)); }
  catch { throw new Error("送信状態を保持できないため送信を中止しました。ブラウザの保存設定を確認してください。"); }
}

export function clearOperation(key: string): void {
  // A stale marker is safe: the next GET can reconcile the server's saved state.
  try { sessionStorage.removeItem(prefix + key); } catch { /* Keep the known server result. */ }
}
