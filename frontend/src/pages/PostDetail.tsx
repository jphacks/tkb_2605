import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { fetchPost, togglePostLike, type ApiPost } from "../api/posts.ts";
import { Icon } from "../components/Icon.tsx";
import "../features/notifications/notifications.css";

function Detail({ postId }: { postId: string }) {
  const [post, setPost] = useState<ApiPost | null>(null);
  const [error, setError] = useState("");
  const [likeError, setLikeError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    fetchPost(postId, controller.signal).then((value) => {
      if (!controller.signal.aborted) { setPost(value); setError(""); setLikeError(""); }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "投稿を取得できませんでした。");
    });
    return () => { mounted.current = false; controller.abort(); };
  }, [postId, attempt]);
  async function like() {
    if (!post || pending.current) return;
    pending.current = true; setBusy(true);
    try {
      const result = await togglePostLike(postId);
      if (mounted.current) setPost((value) => value ? { ...value, ...result } : value);
    } catch (cause) {
      if (mounted.current) setLikeError((cause instanceof Error ? cause.message : "いいねを更新できませんでした。") + " 状態が変わっている可能性があるため、投稿を再取得して確認してください。");
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <section className="notifications-page post-detail-page">
    <header className="notifications-header"><Link className="notifications-back" to="/notifications" aria-label="通知へ戻る"><Icon name="arrow-left" /></Link><div><h1>投稿</h1><p>POST</p></div><Link className="post-detail-home" to="/">ホーム</Link></header>
    {error ? <div className="notifications-error"><p role="alert">{error}</p><button className="secondary-button" onClick={() => setAttempt((value) => value + 1)}>再試行</button><Link to="/notifications">通知へ戻る</Link></div> : !post ? <p className="feed-status" role="status">投稿を読み込んでいます…</p> : <article className="post-card">
      <Link className="avatar-link" to={"/profile/" + encodeURIComponent(post.user_id)} aria-label={post.user_name + "のプロフィールを開く"}><span className="avatar avatar-medium api-avatar"><Icon name="user" size={25} /></span></Link>
      <div className="post-main">
        <div className="post-meta"><Link className="post-author" to={"/profile/" + encodeURIComponent(post.user_id)}>{post.user_name}</Link><time dateTime={post.posted_at}>{new Date(post.posted_at).toLocaleString("ja-JP")}</time></div>
        <p className="post-text">{post.content || (post.post_type === 3 ? "トレーニングを始めました" : "トレーニングの記録")}</p>
        <div className="post-actions"><button type="button" className={"post-action" + (post.is_liked ? " liked" : "")} disabled={busy || !!likeError} aria-pressed={post.is_liked} aria-label={post.is_liked ? "いいねを取り消す" : "いいねする"} onClick={() => void like()}><Icon name="arm" size={18} /><span>{post.like_count}</span></button><span className="post-category">{post.post_type === 2 ? "トレーニング記録" : post.post_type === 3 ? "トレーニング開始" : "投稿"}</span></div>
        {likeError && <div className="notifications-error"><p role="alert">{likeError}</p><button className="secondary-button" onClick={() => setAttempt((value) => value + 1)}>投稿を再取得</button></div>}
        <p className="post-detail-note" id="reply">返信機能は準備中です。</p>
      </div>
    </article>}
  </section>;
}
export default function PostDetail() {
  const { postId = "" } = useParams<"postId">();
  return <Detail key={postId} postId={postId} />;
}
