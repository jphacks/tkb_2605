import { useEffect, useRef, useState } from "react";
import { fetchPosts, togglePostLike, type ApiPost } from "../api/posts.ts";
import { Link } from "react-router";
import { Icon } from "./Icon.tsx";

function appendUniquePosts(current: ApiPost[], incoming: ApiPost[]): ApiPost[] {
  const seen = new Set(current.map((post) => post.post_id));
  return [...current, ...incoming.filter((post) => {
    if (seen.has(post.post_id)) return false;
    seen.add(post.post_id);
    return true;
  })];
}

export function ApiTimeline({ userId, onAuthor }: { userId?: string; onAuthor?: (name: string) => void } = {}) {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likeErrors, setLikeErrors] = useState<Record<string, string>>({});
  const [liking, setLiking] = useState<string[]>([]);
  const pendingLikes = useRef(new Set<string>());
  const pendingPage = useRef(false);
  const nextOffset = useRef<number | null>(0);
  const mounted = useRef(false);
  const pageController = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    pageController.current = controller;
    pendingPage.current = true;
    fetchPosts({ userId, signal: controller.signal }).then((page) => {
      if (!controller.signal.aborted) {
        if (userId && page.results[0]) onAuthor?.(page.results[0].user_name);
        nextOffset.current = page.next_offset;
        setPosts(appendUniquePosts([], page.results));
        setNext(page.next_offset);
      }
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "投稿を取得できませんでした。");
    }).finally(() => {
      if (!controller.signal.aborted) { setLoading(false); pendingPage.current = false; }
    });
    return () => { mounted.current = false; controller.abort(); pageController.current?.abort(); };
  }, [userId, onAuthor]);

  async function loadMore() {
    if (!mounted.current || pendingPage.current || nextOffset.current === null) return;
    const offset = nextOffset.current;
    pendingPage.current = true;
    const controller = new AbortController();
    pageController.current = controller;
    setLoading(true); setError("");
    try {
      const page = await fetchPosts({ userId, offset, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (userId && page.results[0]) onAuthor?.(page.results[0].user_name);
      // Offset pagination can overlap when a new post is inserted; keep existing like state.
      setPosts((items) => appendUniquePosts(items, page.results));
      // Advance only after success, before releasing the request lock. Failed pages retry this offset.
      nextOffset.current = page.next_offset;
      setNext(page.next_offset);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "投稿を取得できませんでした。");
    } finally {
      if (!controller.signal.aborted) { setLoading(false); pendingPage.current = false; }
    }
  }

  async function like(postId: string) {
    if (pendingLikes.current.has(postId)) return;
    pendingLikes.current.add(postId);
    setLiking((ids) => [...ids, postId]);
    setLikeErrors((items) => ({ ...items, [postId]: "" }));
    try {
      const result = await togglePostLike(postId);
      if (mounted.current) setPosts((items) => items.map((post) => post.post_id === postId ? { ...post, ...result } : post));
    } catch (reason) {
      if (mounted.current) setLikeErrors((items) => ({ ...items, [postId]: (reason instanceof Error ? reason.message : "いいねを更新できませんでした。") + " 状態が変わっている可能性があるため、再読み込みで確認してください。" }));
    } finally {
      pendingLikes.current.delete(postId);
      if (mounted.current) setLiking((ids) => ids.filter((id) => id !== postId));
    }
  }

  return <div aria-busy={loading}>
    <div className="post-list">{posts.map((post) => <article className="post-card" key={post.post_id}>
      <Link className="avatar-link" to={"/profile/" + encodeURIComponent(post.user_id)} state={{ profile: { id: post.user_id, name: post.user_name } }} aria-label={post.user_name + "のプロフィールを開く"}><span className="avatar avatar-medium api-avatar" aria-hidden="true"><Icon name="user" size={25} /></span></Link>
      <div className="post-main">
        <div className="post-meta"><Link className="post-author" to={"/profile/" + encodeURIComponent(post.user_id)} state={{ profile: { id: post.user_id, name: post.user_name } }}>{post.user_name}</Link><span className="meta-dot">·</span><time dateTime={post.posted_at} title={new Date(post.posted_at).toLocaleString("ja-JP")}>{new Date(post.posted_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</time></div>
        <Link className="post-content" to={"/posts/" + encodeURIComponent(post.post_id)} aria-label={post.user_name + "の投稿を開く"}><p className="post-text">{post.content || (post.post_type === 3 ? "トレーニングを始めました" : "トレーニングの記録")}</p></Link>
        <div className="post-actions"><Link className="post-action" to={"/posts/" + encodeURIComponent(post.post_id) + "#reply"} aria-label="返信する"><Icon name="message" size={18} /></Link><button className={"post-action" + (post.is_liked ? " liked" : "")} type="button" disabled={liking.includes(post.post_id) || !!likeErrors[post.post_id]} aria-pressed={post.is_liked} aria-label={post.is_liked ? "いいねを取り消す" : "いいねする"} onClick={() => void like(post.post_id)}><Icon name="arm" size={18} /><span>{post.like_count}</span></button><span className="post-category">{post.post_type === 2 ? "トレーニング記録" : post.post_type === 3 ? "トレーニング開始" : "投稿"}</span></div>
        {likeErrors[post.post_id] && <p className="feed-error" role="alert">{likeErrors[post.post_id]}</p>}
      </div>
    </article>)}</div>
    {loading && <p className="feed-status" role="status">投稿を読み込んでいます…</p>}
    {error && <div className="feed-status"><p className="feed-error" role="alert">{error}</p><button type="button" className="secondary-button" disabled={loading} onClick={() => void loadMore()}>再試行</button></div>}
    {!loading && !error && next === null && !posts.length && <div className="empty-state"><Icon name="message" size={30} /><h3>まだ投稿がありません</h3><p>トレーニングの記録がここに表示されます。</p></div>}
    {!loading && !error && next !== null && <div className="feed-status"><button type="button" className="secondary-button" onClick={() => void loadMore()}>もっと見る</button></div>}
    {!loading && !error && next === null && posts.length > 0 && <div className="feed-end"><span /><Icon name="check" size={15} />ここまでの投稿をチェックしました<span /></div>}
  </div>;
}
