import { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchHealth, type Health } from "../api/health.ts";
import ComposeLink from "../components/ComposeLink.tsx";
import Page from "../components/Page.tsx";
import { paths } from "../routes.ts";

type State = { kind: "loading" } | { kind: "done"; health: Health } | { kind: "error"; message: string };

function Badge({ ok, okText, ngText }: { ok: boolean; okText: string; ngText: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
      }`}
    >
      <span className={`size-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
      {ok ? okText : ngText}
    </span>
  );
}

export default function Home() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    fetchHealth(ctrl.signal)
      .then((health) => setState({ kind: "done", health }))
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      });
    return () => ctrl.abort();
  }, []);

  return (
    <Page title="ホーム・タイムライン" description="メンバーの投稿やトレーニングの概要を表示する画面です。">
      <div className="flex flex-wrap gap-3">
        <ComposeLink className="rounded-lg bg-gray-900 px-4 py-3 font-medium text-white">投稿する</ComposeLink>
        <Link to={paths.exercises} className="rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white">トレーニングを開始</Link>
        <Link to={paths.recommendations} className="rounded-lg border border-gray-300 px-4 py-3">初心者向けおすすめ</Link>
        <Link to={paths.chats} className="rounded-lg border border-gray-300 px-4 py-3">チャット一覧</Link>
      </div>
      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold">System status</h2>
        {state.kind === "loading" && <p className="text-gray-500">Checking…</p>}
        {state.kind === "error" && (
          <div className="space-y-2">
            <Badge ok={false} okText="" ngText="Backend Unreachable" />
            <p className="text-sm text-gray-500">{state.message}</p>
          </div>
        )}
        {state.kind === "done" && (
          <div className="flex flex-wrap gap-2">
            <Badge ok okText="Backend Connected" ngText="" />
            <Badge ok={state.health.database === "ok"} okText="Database Ready" ngText="Database Error" />
          </div>
        )}
      </section>
    </Page>
  );
}
