from .models import Posts, Like
from django.db.models import QuerySet


# 投稿の作成
def create_post(
    user_id: str,
    post_type: int,
    content: str,
    workout_id: str | None = None
) -> Posts:
    post = Posts(
        user_id = user_id,
        post_type = post_type,
        content = content,
        workout_id = workout_id
    )
    post.save()
    return post

# IDで検索
# フォロワーの投稿, 特定のユーザの投稿に絞る
def get_posts_by_userids(user_ids: list[str]) -> QuerySet[Posts]:
    return Posts.objects.filter(user_id__in=user_ids)

# offset番目に新しい投稿を取得
def get_new_posts(posts: QuerySet[Posts], limit: int, offset: int) -> QuerySet[Posts]:
    return posts.order_by('-posted_at', 'post_id')[ offset : offset + limit ]

# フォロワーの投稿を取得
def get_followers_new_posts(user_id: str, limit: int, offset: int) -> QuerySet[Posts]:
    # ここはフォロワーを取得するように後で変更する
    follwers = []
    followers_posts = get_posts_by_userids(follwers)
    return get_new_posts(followers_posts, limit, offset)

# 特定のユーザの投稿を取得
def get_user_new_posts(user_id: str, limit: int, offset: int) -> QuerySet[Posts]:
    user_posts = get_posts_by_userids([user_id])
    return get_new_posts(user_posts, limit, offset)

# 投稿が存在するか確認
def post_exists(post_id: str) -> bool:
    return Posts.objects.filter(post_id=post_id).exists()

# いいねする
def like_post(user_id: str, post_id: str) -> Like:
    like, _ = Like.objects.get_or_create(
        user_id=user_id,
        post_id_id=post_id,
    )
    return like

# いいね数のカウント
def count_likes(post_id: str) -> int:
    return Like.objects.filter(post_id=post_id).count()

# すでにいいねしているか確認
def has_liked(user_id: str, post_id: str) -> bool:
    return Like.objects.filter(user_id=user_id, post_id=post_id).exists()