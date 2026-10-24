import { createContext, useContext, useSyncExternalStore } from "react";
import { createSeedData, CURRENT_USER_ID } from "./seed.ts";
import type { Notification, Post, SocialData, SocialSnapshot, SocialStore, User } from "./types.ts";

export { CURRENT_USER_ID } from "./seed.ts";
export type { Notification, Post, User } from "./types.ts";

const STORAGE_KEY = "workout.social.v1";
const MAX_IMAGE_LENGTH = 3_000_000;
const AVATARS = ["mint", "peach", "lavender", "blue"];
const BUNDLED_IMAGES = ["/images/training-room.svg", "/images/running-track.svg"];
const STORAGE_ERROR = "ブラウザに保存できませんでした。変更はこの画面を閉じるまで有効です。";

export const SocialContext = createContext<SocialStore | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") && new Set(value).size === value.length;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isImage(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_IMAGE_LENGTH && (
    BUNDLED_IMAGES.includes(value) || /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}

function isUser(value: unknown): value is User {
  return isRecord(value) && typeof value.id === "string" && value.id.length > 0 &&
    typeof value.name === "string" && value.name.trim().length > 0 && value.name.length <= 40 &&
    typeof value.handle === "string" && /^[a-zA-Z0-9_]{1,40}$/.test(value.handle) &&
    typeof value.bio === "string" && value.bio.length <= 160 &&
    typeof value.avatar === "string" && AVATARS.includes(value.avatar) &&
    isStringArray(value.followingIds) && isStringArray(value.followerIds);
}

function isPost(value: unknown): value is Post {
  return isRecord(value) && typeof value.id === "string" && value.id.length > 0 &&
    typeof value.authorId === "string" && typeof value.text === "string" && value.text.length <= 500 &&
    (value.image === undefined || isImage(value.image)) && (value.text.trim().length > 0 || isImage(value.image)) &&
    isDate(value.createdAt) && isStringArray(value.likedBy) &&
    (value.parentId === undefined || typeof value.parentId === "string");
}

function isNotification(value: unknown): value is Notification {
  return isRecord(value) && typeof value.id === "string" && value.id.length > 0 &&
    typeof value.actorId === "string" && ["like", "reply", "follow"].includes(String(value.type)) &&
    (value.postId === undefined || typeof value.postId === "string") &&
    (value.type === "follow" || typeof value.postId === "string") &&
    isDate(value.createdAt) && typeof value.read === "boolean";
}

function hasValidReplyChains(posts: Post[]): boolean {
  const byId = new Map(posts.map((post) => [post.id, post]));
  return posts.every((post) => {
    const visited = new Set([post.id]);
    let parentId = post.parentId;
    while (parentId !== undefined) {
      const parent = byId.get(parentId);
      if (!parent || visited.has(parentId)) return false;
      visited.add(parentId);
      parentId = parent.parentId;
    }
    return true;
  });
}

function isSocialData(value: unknown): value is SocialData {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.users) ||
    !value.users.every(isUser) || !Array.isArray(value.posts) || !value.posts.every(isPost) ||
    !Array.isArray(value.notifications) || !value.notifications.every(isNotification)) return false;

  const users = value.users;
  const posts = value.posts;
  const notifications = value.notifications;
  const userIds = new Set(users.map((user) => user.id));
  const postIds = new Set(posts.map((post) => post.id));
  return userIds.has(CURRENT_USER_ID) && userIds.size === users.length && postIds.size === posts.length &&
    new Set(notifications.map((notification) => notification.id)).size === notifications.length &&
    users.every((user) => [...user.followingIds, ...user.followerIds].every((id) => id !== user.id && userIds.has(id))) &&
    posts.every((post) => userIds.has(post.authorId) && post.likedBy.every((id) => userIds.has(id))) &&
    hasValidReplyChains(posts) &&
    notifications.every((notification) => userIds.has(notification.actorId) &&
      (notification.postId === undefined || postIds.has(notification.postId)));
}

function readData(): { data: SocialData; error: string | null } {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { data: createSeedData(), error: null };
    const parsed: unknown = JSON.parse(saved);
    if (isSocialData(parsed)) return { data: parsed, error: null };
    return { data: createSeedData(), error: "保存データを読み込めなかったため、サンプルデータを表示しています。" };
  } catch {
    return { data: createSeedData(), error: "保存データを読み込めませんでした。サンプルデータを表示しています。" };
  }
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id];
}

export function createSocialStore(): SocialStore {
  const initial = readData();
  let data = initial.data;
  const listeners = new Set<() => void>();
  let snapshot: SocialSnapshot;

  function makeSnapshot(storageError: string | null): SocialSnapshot {
    return {
      users: data.users,
      posts: data.posts,
      notifications: data.notifications,
      currentUser: data.users.find((user) => user.id === CURRENT_USER_ID)!,
      storageError,
      addPost,
      toggleLike,
      updateProfile,
      markNotificationsRead,
      toggleFollow,
    };
  }

  function update(next: SocialData) {
    data = next;
    let storageError: string | null = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      storageError = STORAGE_ERROR;
    }
    snapshot = makeSnapshot(storageError);
    listeners.forEach((listener) => listener());
  }

  function addPost(text: string, image?: string, parentId?: string): string {
    const trimmed = text.trim();
    if ((!trimmed && !image) || trimmed.length > 500 || (image !== undefined && !isImage(image))) return "";
    if (parentId !== undefined && !data.posts.some((post) => post.id === parentId)) return "";
    const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `post-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const post: Post = { id, authorId: CURRENT_USER_ID, text: trimmed, createdAt: new Date().toISOString(), likedBy: [] };
    if (image) post.image = image;
    if (parentId) post.parentId = parentId;
    update({ ...data, posts: [post, ...data.posts] });
    return id;
  }

  function toggleLike(postId: string) {
    if (!data.posts.some((post) => post.id === postId)) return;
    update({ ...data, posts: data.posts.map((post) => post.id === postId ? { ...post, likedBy: toggleId(post.likedBy, CURRENT_USER_ID) } : post) });
  }

  function updateProfile(changes: Pick<User, "name" | "bio">) {
    const name = changes.name.trim();
    if (!name || name.length > 40 || changes.bio.length > 160) return;
    update({ ...data, users: data.users.map((user) => user.id === CURRENT_USER_ID ? { ...user, name, bio: changes.bio.trim() } : user) });
  }

  function markNotificationsRead() {
    if (data.notifications.every((notification) => notification.read)) return;
    update({ ...data, notifications: data.notifications.map((notification) => ({ ...notification, read: true })) });
  }

  function toggleFollow(userId: string) {
    if (userId === CURRENT_USER_ID || !data.users.some((user) => user.id === userId)) return;
    update({ ...data, users: data.users.map((user) => {
      if (user.id === CURRENT_USER_ID) return { ...user, followingIds: toggleId(user.followingIds, userId) };
      if (user.id === userId) return { ...user, followerIds: toggleId(user.followerIds, CURRENT_USER_ID) };
      return user;
    }) });
  }

  snapshot = makeSnapshot(initial.error);
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export function useSocial(): SocialSnapshot {
  const store = useContext(SocialContext);
  if (!store) throw new Error("useSocial must be used within SocialProvider");
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
