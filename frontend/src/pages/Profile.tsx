import { Link, useParams } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { useSocial } from "../features/social/useSocial.ts";

export default function Profile() {
  const { userId } = useParams();
  const { currentUser, users, posts, toggleFollow } = useSocial();
  const user = users.find((item) => item.id === userId);
  const userPosts = posts.filter((post) => post.authorId === userId && !post.parentId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const isSelf = user?.id === currentUser.id;
  const isFollowing = user ? currentUser.followingIds.includes(user.id) : false;

  return (
    <>
      <PageHeader title={user?.name ?? "プロフィール"} subtitle={user ? `${userPosts.length} 件の投稿` : undefined} />
      {!user ? (
        <div className="empty-state"><h2>ユーザーが見つかりませんでした</h2><Link className="secondary-button" to="/">ホームに戻る</Link></div>
      ) : (
        <>
          <section className="profile-header page-content">
            <div className="profile-cover" aria-hidden="true"><Icon name="dumbbell" size={50} /></div>
            <div className="profile-toolbar"><Avatar user={user} size="large" linked={false} />{isSelf ? <Link className="secondary-button" to="/settings"><Icon name="settings" size={16} />プロフィールを編集</Link> : <button type="button" className={isFollowing ? "secondary-button" : "primary-button"} aria-pressed={isFollowing} onClick={() => toggleFollow(user.id)}>{isFollowing ? "フォロー中" : "フォローする"}</button>}</div>
            <h2>{user.name}</h2>
            <p className="muted">@{user.handle}</p>
            <p className="profile-bio">{user.bio || "自己紹介はまだありません。"}</p>
            <div className="profile-stats"><span><strong>{user.followingIds.length}</strong> フォロー中</span><span><strong>{user.followerIds.length}</strong> フォロワー</span></div>
          </section>
          <div className="profile-post-heading"><h2 className="section-heading">投稿</h2></div>
          <div className="post-list">{userPosts.map((post) => <PostCard key={post.id} post={post} />)}</div>
          {!userPosts.length && <div className="empty-state"><h3>まだ投稿はありません</h3><p className="muted">{isSelf ? "今日のトレーニングをシェアしてみよう。" : "これからの投稿を楽しみに待ちましょう。"}</p>{isSelf && <Link className="primary-button" to="/compose">最初の投稿をする</Link>}</div>}
        </>
      )}
    </>
  );
}
