import { useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import { registerUser } from "../api/auth.ts";
import { useAuth } from "../features/auth/useAuth.ts";
import { refreshSession, signIn } from "../features/auth/session.ts";
import { paths } from "../routes.ts";
import { Icon } from "../components/Icon.tsx";
import "./Login.css";

export default function Login() {
  const auth = useAuth();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (register && password !== confirmation) { setError("確認用パスワードが一致しません。"); return; }
    lock.current = true; setBusy(true); setError(""); setNotice("");
    const credentials = { email: email.trim(), password };
    try {
      if (register) {
        await registerUser({ ...credentials, user_name: name.trim() });
        setRegister(false);
        setNotice("アカウントを作成しました。ログインできない場合は、もう一度ログインしてください。");
      }
      await signIn(credentials);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TypeError" ? cause.message : "通信できませんでした。接続を確認してください。送信後に接続が切れた場合は、ログイン状態の再確認をお試しください。");
    } finally {
      setPassword(""); setConfirmation(""); setBusy(false); lock.current = false;
    }
  }
  if (auth.status === "authenticated") return <Navigate to={paths.home} replace />;
  if (auth.status === "loading") return <main className="auth-status" role="status">ログイン状態を確認しています…</main>;
  if (auth.status === "error") return <main className="auth-status"><p role="alert">{auth.error}</p><button className="primary-button" onClick={() => void refreshSession()}>再試行</button></main>;

  return <main className="auth-page">
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-brand"><Icon name="dumbbell" size={30} /><span>MUSCLE MATE</span></div>
      <h1 id="auth-title">{register ? "アカウントを作成" : "ログイン"}</h1>
      <form onSubmit={(event) => void submit(event)} aria-busy={busy}>
        <fieldset disabled={busy} className="auth-fields">
          {register && <label>名前<input name="user_name" autoComplete="nickname" required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} /></label>}
          <label>メールアドレス<input name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>パスワード<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {register && <><p className="auth-help">8文字以上で、よく使われる単語や数字だけのパスワードは避けてください。</p><label>パスワード（確認）<input name="password_confirmation" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label></>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit">{busy ? "確認しています…" : register ? "登録してはじめる" : "ログイン"}<Icon name="arrow-right" size={18} /></button>
        </fieldset>
      </form>
      <button className="auth-switch" disabled={busy} onClick={() => { setRegister(!register); setPassword(""); setConfirmation(""); setError(""); setNotice(""); }}>{register ? "アカウントをお持ちの方はログイン" : "はじめての方はこちら · 新規登録"}</button>
      {error && <button className="auth-switch" disabled={busy} onClick={() => void refreshSession()}>ログイン状態を再確認</button>}
    </section>
    <p className="auth-footer">© チーム_M1</p>
  </main>;
}
