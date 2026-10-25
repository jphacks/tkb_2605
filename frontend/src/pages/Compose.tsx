import { useAuth } from "../features/auth/useAuth.ts";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { createPost, type CreatePost } from "../api/posts.ts";
import type { ComposeLocationState } from "../features/posts/navigation.ts";
import { paths } from "../routes.ts";
import "./Compose.css";

export default function Compose() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = location.state as ComposeLocationState | null;
  const workoutId = searchParams.get("workoutId");
  const workout = state?.workout?.workout_id === workoutId ? state.workout : null;
  const [content, setContent] = useState(state?.initialContent ?? "");
  const contentLength = [...content.trim()].length;
  const canSubmit = (!!content.trim() || !!workoutId) && contentLength <= 500;
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
    if (!canSubmit || requestRef.current) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setSubmitting(true);
    setError(null);
    const input: CreatePost = workoutId
      ? { post_type: 2, content: message, workout_id: workoutId }
      : { post_type: 1, content: message };

    try {
      const created = await createPost(input, controller.signal);
      if (!controller.signal.aborted) void navigate("/posts/" + encodeURIComponent(created.post_id), { replace: true });
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
          <button type="submit" className="compose-submit" disabled={!canSubmit || submitting}>
            {submitting ? "投稿中…" : "投稿"}
          </button>
        </header>

        <div className="compose-content">
          <div className="compose-avatar" aria-hidden="true">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" />
            </svg>
          </div>
          <div className="compose-editor"><p className="compose-label">{user?.user_name}</p>
            <label htmlFor="compose-message" className="compose-label">メッセージ</label>
            <textarea
              ref={textareaRef}
              id="compose-message"
              name="content"
              maxLength={1000}
              placeholder="いまどうしてる？"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              readOnly={submitting}
              aria-invalid={error || contentLength > 500 ? true : undefined}
              aria-describedby={error ? "compose-limit compose-error" : "compose-limit"}
            />
            <p id="compose-limit" className="compose-status">{contentLength} / 500文字{workoutId ? "（本文は省略できます）" : ""}</p>
            {workoutId && <aside className="compose-attachment" aria-label="共有するメニュー">
              <p>トレーニング記録を添付</p>
              {workout && <ul className="compose-workout-menus">
                {workout.exercises.filter((exercise) => exercise.sets.length > 0).map((exercise) => (
                  <li key={exercise.workout_exercise_id}>
                    <p>{exercise.display_name}（{exercise.sets.length}セット）</p>
                    <ul className="compose-workout-sets">
                      {exercise.sets.map((set) => <li key={set.workout_set_id}>
                        セット{set.set_number}：{set.weight} kg × {set.reps} 回
                      </li>)}
                    </ul>
                  </li>
                ))}
              </ul>}
            </aside>}
            {error && <p id="compose-error" className="compose-error" role="alert">{error}</p>}
          </div>
        </div>
        <p className="compose-status" role="status">{submitting ? "メッセージを投稿しています。" : ""}</p>
      </form>
    </dialog>
  );
}
