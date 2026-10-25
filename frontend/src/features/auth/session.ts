import { releaseDevicePush } from "../notifications/push.ts";
import { fetchCurrentUser, loginUser, logoutUser, refreshCsrf, type AuthUser, type Credentials } from "../../api/auth.ts";
import { onAuthenticationFailure, resetApiSession, setAuthenticatedUserId } from "../../api/http.ts";
import { clearWorkoutSession } from "../workouts/session.ts";
import { resetCurrentProfile, refreshCurrentProfile } from "../profile/currentProfile.ts";

export type AuthState = { status: "loading" | "authenticated" | "anonymous" | "error"; user: AuthUser | null; error: string; revision: number };
let state: AuthState = { status: "loading", user: null, error: "", revision: 0 };
let serial = 0;
let pending: Promise<void> | null = null;
let changing = false;
const listeners = new Set<() => void>();
function broadcastChange() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel("workout-auth");
    channel.postMessage("session-changed");
    channel.close();
  } catch { /* Focus refresh still works if cross-tab messaging is unavailable. */ }
}
export const getAuthState = () => state;
export function subscribeAuth(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function update(next: AuthState) { state = next; listeners.forEach((listener) => listener()); }
function clearIdentity() {
  resetApiSession(); clearWorkoutSession(); resetCurrentProfile();
}
async function accept(user: AuthUser | null) {
  const changed = state.user?.user_id !== user?.user_id;
  if (changed) clearIdentity();
  setAuthenticatedUserId(user?.user_id ?? null);
  if (user) resetCurrentProfile({ id: user.user_id, name: user.user_name });
  if (user) await refreshCsrf();
  update({ status: user ? "authenticated" : "anonymous", user, error: "", revision: state.revision + (changed ? 1 : 0) });
  if (user) void refreshCurrentProfile();
}
export function refreshSession(): Promise<void> {
  if (changing) return Promise.resolve();
  if (pending) return pending;
  const requestSerial = serial;
  const task = (async () => {
    try {
      const user = await fetchCurrentUser();
      if (requestSerial !== serial) return;
      if (state.user && state.user.user_id !== user?.user_id) {
        update({ ...state, status: "loading" });
        await releaseDevicePush();
        if (requestSerial !== serial) return;
      }
      await accept(user);
    } catch {
      if (requestSerial === serial) update({ ...state, status: "error", error: "ログイン状態を確認できませんでした。接続を確認して再試行してください。" });
    }
  })();
  pending = task;
  void task.finally(() => { if (pending === task) pending = null; });
  return task;
}
export async function signIn(input: Credentials) {
  if (changing) return;
  changing = true; serial += 1; pending = null;
  try {
    const user = await loginUser(input);
    // The login response rotates the CSRF secret. Do not reuse the old token.
    await accept(user);
    broadcastChange();
  } catch (error) {
    if (state.user) update({ ...state, status: "error", error: "ログイン後の通信を確認できませんでした。再試行してください。" });
    throw error;
  } finally { changing = false; }
}
export async function signOut() {
  if (changing) return;
  changing = true; serial += 1; pending = null;
  const previous = state;
  clearIdentity();
  update({ ...state, status: "loading", revision: state.revision + 1 });
  try {
    await releaseDevicePush();
    try { await logoutUser(); }
    catch (error) {
      // A lost logout response may already have cleared the server session.
      if (await fetchCurrentUser()) throw error;
    }
    await accept(null);
    broadcastChange();
  } catch {
    if (previous.user) resetCurrentProfile({ id: previous.user.user_id, name: previous.user.user_name });
    setAuthenticatedUserId(previous.user?.user_id ?? null);
    update({ ...previous, revision: state.revision, error: "ログアウトできませんでした。接続を確認してもう一度お試しください。" });
  } finally { changing = false; }
}
onAuthenticationFailure(refreshSession);
