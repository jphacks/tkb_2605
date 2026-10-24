import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { useSocial } from "../features/social/useSocial.ts";

export default function PostDetail() {
  const { postId } = useParams();
  return <PostThread key={postId} postId={postId} />;
}

function PostThread({ postId }: { postId: string | undefined }) {
  const { posts, users, currentUser, addPost } = useSocial();
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const post = posts.find((item) => item.id === postId);
  const author = users.find((user) => user.id === post?.authorId);
  const replies = posts.filter((item) => item.parentId === postId).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post || !reply.trim()) return;
    if (addPost(reply, undefined, post.id)) {
      setReply("");
      setError("");
    } else setError("返信できませんでした。内容を確認して、もう一度お試しください。");
  }

  return (
    <>
      <PageHeader title="投稿" />
      {!post ? (
        <div className="empty-state"><h2>投稿が見つかりませんでした</h2><p>投稿が削除されたか、URLが正しくない可能性があります。</p><Link className="secondary-button" to="/">ホームに戻る</Link></div>
      ) : (
        <>
          {post.parentId && <div className="reply-context"><Link to={`/posts/${post.parentId}`}>返信元の投稿を見る</Link></div>}
          <PostCard post={post} detail />
          <div className="page-content reply-section" id="reply">
            <h2 className="section-heading">返信 <span className="muted">{replies.length}</span></h2>
            <form className="reply-form" onSubmit={submit}>
              <Avatar user={currentUser} size="small" linked={false} />
              <div className="reply-fields">
                <label className="form-field" htmlFor="reply-text"><span>{author?.name ?? "この投稿"}さんに返信</span><textarea id="reply-text" className="field" rows={3} maxLength={500} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="応援や感想を送ってみよう" aria-describedby="reply-count" /></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="form-actions"><span id="reply-count" className="character-count">{reply.length} / 500</span><button className="primary-button" type="submit" disabled={!reply.trim()}>返信する</button></div>
              </div>
            </form>
          </div>
          <div className="post-list">{replies.map((item) => <PostCard key={item.id} post={item} />)}</div>
          {!replies.length && <p className="empty-state muted">まだ返信はありません。最初のひとことを送ってみよう。</p>}
        </>
      )}
    </>
  );
}
