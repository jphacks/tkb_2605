import { Link } from "react-router";
import type { Post } from "../features/social/types.ts";
import { useSocial } from "../features/social/useSocial.ts";
import { Avatar } from "./Avatar.tsx";
import { Icon } from "./Icon.tsx";

export function PostCard({ post, detail = false }: { post: Post; detail?: boolean }) {
  const { users, posts, currentUser, toggleLike } = useSocial();
  const author = users.find((user) => user.id === post.authorId);
  if (!author) return null;
  const liked = post.likedBy.includes(currentUser.id);
  const replies = posts.filter((reply) => reply.parentId === post.id).length;
  const date = new Date(post.createdAt);
  const content = <><p className="post-text">{post.text}</p>{post.image && <img className="post-image" src={post.image} alt={`${author.name}の投稿に添付された画像`} loading="lazy" />}</>;

  return <article className={`post-card${detail ? " post-detail" : ""}`}>
    <Avatar user={author} />
    <div className="post-main">
      <div className="post-meta">
        <Link className="post-author" to={`/profile/${author.id}`}>{author.name}</Link>
        <span className="post-handle">@{author.handle}</span><span className="meta-dot">·</span>
        <time dateTime={post.createdAt} title={date.toLocaleString("ja-JP")}>{date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</time>
      </div>
      {detail ? <div className="post-content">{content}</div> : <Link className="post-content" to={`/posts/${post.id}`} aria-label={`${author.name}の投稿を開く: ${post.text || "画像の投稿"}`}>{content}</Link>}
      <div className="post-actions">
        <Link to={`/posts/${post.id}#reply`} className="post-action" aria-label={`返信する（${replies}件）`}><Icon name="message" size={18} /><span>{replies}</span></Link>
        <button className={`post-action${liked ? " liked" : ""}`} type="button" aria-label={liked ? "いいねを取り消す" : "いいねする"} aria-pressed={liked} onClick={() => toggleLike(post.id)}><Icon name="heart" size={18} /><span>{post.likedBy.length}</span></button>
        <span className="post-category"><span /> WORKOUT LOG</span>
      </div>
    </div>
  </article>;
}
