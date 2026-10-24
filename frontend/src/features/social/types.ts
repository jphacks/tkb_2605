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
  users: User[];
  posts: Post[];
  notifications: Notification[];
};
