import { getOwnProfile, type Profile } from "../../api/profiles.ts";
import type { User } from "../social/types.ts";
export type CurrentProfile = User & { color: string };
let current: CurrentProfile = { id: "", name: "", bio: "", avatar: "mint", color: "#f0d9d1" };
let generation = 0;
let pending: { generation: number; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();
export const getCurrentProfile = () => current;
export function subscribeCurrentProfile(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function notify() { listeners.forEach((listener) => listener()); }
export function resetCurrentProfile(identity?: { id: string; name: string }) {
  if (identity && current.id === identity.id) { if (current.name !== identity.name) { current = { ...current, name: identity.name }; notify(); } return; }
  generation += 1;
  current = { id: identity?.id ?? "", name: identity?.name ?? "", bio: "", avatar: "mint", color: "#f0d9d1" };
  notify();
}
export function acceptProfile(value: Profile) {
  if (value.user_id !== current.id) return;
  generation += 1;
  current = { id: value.user_id, name: value.user_name, bio: value.bio, color: value.avatar_color, avatar: "mint" };
  notify();
}
export function refreshCurrentProfile(): Promise<void> {
  if (!current.id) return Promise.resolve();
  if (pending?.generation === generation) return pending.promise;
  const version = generation;
  const promise = getOwnProfile().then((value) => { if (version === generation) acceptProfile(value); }).catch(() => { /* Profile pages expose retrieval errors and retry; authentication stays usable. */ }).finally(() => { if (pending?.promise === promise) pending = null; });
  pending = { generation: version, promise };
  return promise;
}
