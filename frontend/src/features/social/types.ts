export type User = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatar: "mint" | "peach" | "lavender" | "blue";
  followingIds: string[];
  followerIds: string[];
};

export type Post = {
  id: string;
  authorId: string;
  text: string;
  image?: string;
  createdAt: string;
  likedBy: string[];
  parentId?: string;
};

export type Notification = {
  id: string;
  actorId: string;
  type: "like" | "reply" | "follow";
  postId?: string;
  createdAt: string;
  read: boolean;
};

export type SocialData = {
  version: 1;
  users: User[];
  posts: Post[];
  notifications: Notification[];
};

export type SocialSnapshot = Omit<SocialData, "version"> & {
  currentUser: User;
  storageError: string | null;
  addPost: (text: string, image?: string, parentId?: string) => string;
  toggleLike: (postId: string) => void;
  updateProfile: (changes: Pick<User, "name" | "bio">) => void;
  markNotificationsRead: () => void;
  toggleFollow: (userId: string) => void;
};

export type SocialStore = {
  getSnapshot: () => SocialSnapshot;
  subscribe: (listener: () => void) => () => void;
};
