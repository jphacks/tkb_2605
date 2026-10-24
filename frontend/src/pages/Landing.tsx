import { useEffect, useState } from "react";
import { fetchHealth, type Health } from "../api/health.ts";

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

export default function Landing() {
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
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4">
      <h1 className="text-3xl font-bold">Workout App</h1>
      <p className="text-gray-600">React + Vite / Django REST Framework / SQLite</p>
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
    </main>
  );
}
