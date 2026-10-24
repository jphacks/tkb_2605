import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { paths } from "../routes.ts";

export default function Login({ onPreview }: { onPreview: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { from?: unknown } | null;
  const from = typeof state?.from === "string" && state.from.startsWith("/") && !state.from.startsWith("//") ? state.from : paths.home;
  const [visible, setVisible] = useState(false);
  const [notice, setNotice] = useState("");

  function startPreview() {
    onPreview();
    void navigate(from, { replace: true });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("ログイン機能は準備中です。入力内容は送信・保存されていません。");
  }

  return (
    <main className="grid min-h-dvh bg-stone-50 lg:grid-cols-2">
      <section className="flex flex-col justify-center bg-emerald-950 px-6 py-6 text-white sm:px-12 lg:p-16" aria-label="サービス紹介">
        <p className="text-xs font-bold tracking-[0.25em] text-emerald-300">KINTŌRE</p>
        <div className="my-12 hidden gap-2 lg:flex" aria-hidden="true"><span className="h-14 w-4 rounded-md bg-emerald-300" /><span className="mt-4 h-6 w-16 rounded bg-emerald-300" /><span className="h-14 w-4 rounded-md bg-emerald-300" /></div>
        <p className="mt-4 text-2xl font-bold leading-relaxed lg:mt-0 lg:text-4xl">今日の一歩を、<br />明日の自分へ。</p>
        <p className="mt-5 hidden max-w-sm text-sm leading-7 text-emerald-100 lg:block">トレーニングを記録して、仲間と続ける。<br />あなたのペースで、少しずつ。</p>
        <div className="mt-8 hidden flex-wrap gap-2 text-xs text-emerald-100 lg:flex"><span className="rounded-full border border-emerald-700 px-3 py-2">日々の記録</span><span className="rounded-full border border-emerald-700 px-3 py-2">種目を見つける</span><span className="rounded-full border border-emerald-700 px-3 py-2">仲間とつながる</span></div>
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">またここから、トレーニングを始めよう。</p>
          <p id="login-availability" className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-6 text-amber-900">ログイン機能は準備中です。現在は画面の確認のみ行えます。</p>
          <form onSubmit={submit} aria-describedby="login-availability" className="mt-6 space-y-5">
            <label className="block"><span className="text-sm font-semibold text-gray-700">メールアドレス</span><input type="email" name="email" autoComplete="username" required placeholder="you@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base outline-emerald-700" /></label>
            <label className="block"><span className="text-sm font-semibold text-gray-700">パスワード</span><input id="password" type={visible ? "text" : "password"} name="password" autoComplete="current-password" required className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base outline-emerald-700" /></label>
            <button type="button" aria-controls="password" aria-pressed={visible} onClick={() => setVisible((value) => !value)} className="min-h-11 text-sm font-medium text-emerald-800 underline underline-offset-4">{visible ? "パスワードを隠す" : "パスワードを表示"}</button>
            <button type="submit" className="min-h-12 w-full rounded-xl bg-emerald-800 px-4 font-semibold text-white hover:bg-emerald-900">ログイン</button>
            {notice && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">{notice}</p>}
          </form>
          {import.meta.env.DEV && <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-xs leading-6 text-gray-500">開発環境では、各画面の遷移をプレビューできます。</p>
            <button type="button" onClick={startPreview} className="mt-3 min-h-12 w-full rounded-xl border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">画面をプレビュー</button>
          </div>}
        </div>
      </section>
    </main>
  );
}
