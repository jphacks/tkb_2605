import { Link } from "react-router";
import type { Post } from "../features/social/types.ts";
import { currentUser, homePreview } from "../features/social/seed.ts";
import { Avatar } from "./Avatar.tsx";
import { Icon } from "./Icon.tsx";

export function PostCard({ post, liked, onToggleLike }: { post: Post; liked: boolean; onToggleLike: () => void }) {
  const { users, posts } = homePreview;
  const author = users.find((user) => user.id === post.authorId);
  if (!author) return null;
  const likeCount = post.likedBy.length + Number(liked) - Number(post.likedBy.includes(currentUser.id));
  const replies = posts.filter((reply) => reply.parentId === post.id).length;
  const date = new Date(post.createdAt);
  const content = <><p className="post-text">{post.text}</p>{post.image && <img className="post-image" src={post.image} alt={`${author.name}の投稿に添付された画像`} loading="lazy" />}</>;

  return <article className="post-card">
    <Avatar user={author} />
    <div className="post-main">
      <div className="post-meta">
        <Link className="post-author" to={`/profile/${author.id}`}>{author.name}</Link>
        <span className="post-handle">@{author.handle}</span><span className="meta-dot">·</span>
        <time dateTime={post.createdAt} title={date.toLocaleString("ja-JP")}>{date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</time>
      </div>
      <Link className="post-content" to={`/posts/${post.id}`} aria-label={`${author.name}の投稿を開く: ${post.text || "画像の投稿"}`}>{content}</Link>
      <div className="post-actions">
        <Link to={`/posts/${post.id}#reply`} className="post-action" aria-label={`返信する（${replies}件）`}><Icon name="message" size={18} /><span>{replies}</span></Link>
        <button className={`post-action${liked ? " liked" : ""}`} type="button" aria-label={liked ? "いいねを取り消す" : "いいねする"} aria-pressed={liked} onClick={onToggleLike}><Icon name="arm" size={18} /><span>{likeCount}</span></button>
        <span className="post-category"><span /> WORKOUT LOG</span>
      </div>
    </div>
  </article>;
}
