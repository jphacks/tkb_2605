import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { useSocial } from "../features/social/useSocial.ts";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default function Compose() {
  const { currentUser, addPost } = useSocial();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string>();
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const readId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const requestId = ++readId.current;
    setReading(false);
    setError("");
    if (!imageTypes.has(file.type)) {
      setError("JPEG・PNG・WebP・GIF形式の画像を選択してください。");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("画像は2MB以内のものを選択してください。");
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (requestId !== readId.current) return;
      setReading(false);
      if (typeof reader.result === "string") setImage(reader.result);
    };
    reader.onerror = () => {
      if (requestId !== readId.current) return;
      setReading(false);
      setError("画像を読み込めませんでした。もう一度選択してください。");
    };
    reader.readAsDataURL(file);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reading || (!text.trim() && !image)) return;
    const postId = addPost(text, image);
    if (postId) navigate(`/posts/${postId}`);
    else setError("投稿できませんでした。内容を確認して、もう一度お試しください。");
  }

  return (
    <>
      <PageHeader title="投稿する" subtitle="今日のがんばりを、仲間とシェア。" />
      <div className="page-content">
        <form className="composer" onSubmit={submit}>
          <div className="composer-author">
            <Avatar user={currentUser} linked={false} />
            <div><strong>{currentUser.name}</strong><p className="muted">@{currentUser.handle}</p></div>
          </div>
          <label className="form-field" htmlFor="post-text">
            <span>投稿内容</span>
            <textarea id="post-text" className="field composer-textarea" rows={7} maxLength={500} value={text} onChange={(event) => setText(event.target.value)} placeholder="今日のトレーニングはどうだった？" aria-describedby="post-count" />
          </label>
          {image && (
            <div className="image-preview">
              <img src={image} alt="投稿する画像のプレビュー" />
              <button type="button" className="icon-button image-remove" aria-label="添付画像を削除" onClick={() => { ++readId.current; setImage(undefined); setReading(false); }}><Icon name="close" /></button>
            </div>
          )}
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={selectImage} className="visually-hidden" tabIndex={-1} aria-label="投稿画像を選択" />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()} disabled={reading}><Icon name="image" size={18} />{reading ? "読み込み中…" : "画像を追加"}</button>
            <span id="post-count" className="character-count">{text.length} / 500</span>
            <button type="submit" className="primary-button" disabled={reading || (!text.trim() && !image)}>投稿する<Icon name="arrow-right" size={18} /></button>
          </div>
          <p className="form-hint muted">画像は1枚、2MBまで添付できます。</p>
        </form>
      </div>
    </>
  );
}
