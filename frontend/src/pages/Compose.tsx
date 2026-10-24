import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { createPost, type CreatePostInput } from "../api/posts.ts";
import type { ComposeLocationState } from "../features/posts/navigation.ts";
import { paths } from "../routes.ts";
import "./Compose.css";

export default function Compose() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = location.state as ComposeLocationState | null;
  const workoutId = searchParams.get("workoutId");
  const [content, setContent] = useState(state?.initialContent ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    textareaRef.current?.focus();

    return () => {
      requestRef.current?.abort();
      document.body.style.overflow = previousOverflow;
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function returnToBackground() {
    if (state?.backgroundLocation && state.backgroundLocation.pathname !== paths.compose) {
      void navigate(-1);
    } else {
      void navigate(paths.home, { replace: true });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = content.trim();
    if (!message || requestRef.current) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setSubmitting(true);
    setError(null);
    const input: CreatePostInput = workoutId
      ? { post_type: 2, content: message, workout_id: workoutId }
      : { post_type: 1, content: message };

    try {
      await createPost(input, controller.signal);
      if (!controller.signal.aborted) returnToBackground();
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error && cause.name !== "TypeError"
          ? cause.message
          : "通信できませんでした。接続を確認して、もう一度お試しください。");
      }
    } finally {
      if (!controller.signal.aborted) {
        requestRef.current = null;
        setSubmitting(false);
      }
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="compose-dialog"
      aria-labelledby="compose-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!requestRef.current) returnToBackground();
      }}
    >
      <form onSubmit={(event) => { void handleSubmit(event); }} aria-busy={submitting}>
        <header className="compose-header">
          <button type="button" className="compose-close" onClick={returnToBackground} disabled={submitting}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
            閉じる
          </button>
          <h1 id="compose-heading" className="compose-heading">投稿を作成</h1>
          <button type="submit" className="compose-submit" disabled={!content.trim() || submitting}>
            {submitting ? "投稿中…" : "投稿"}
          </button>
        </header>

        <div className="compose-content">
          <div className="compose-avatar" aria-hidden="true">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" />
            </svg>
          </div>
          <div className="compose-editor">
            <label htmlFor="compose-message" className="compose-label">メッセージ</label>
            <textarea
              ref={textareaRef}
              id="compose-message"
              name="content"
              placeholder="いまどうしてる？"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              readOnly={submitting}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "compose-error" : undefined}
            />
            {workoutId && <p className="compose-attachment">トレーニング記録を添付</p>}
            {error && <p id="compose-error" className="compose-error" role="alert">{error}</p>}
          </div>
        </div>
        <p className="compose-status" role="status">{submitting ? "メッセージを投稿しています。" : ""}</p>
      </form>
    </dialog>
  );
}
