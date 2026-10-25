import { useLocation, useNavigate } from "react-router";
import Page from "../components/Page.tsx";
import { paths } from "../routes.ts";

export default function Login({ onPreview }: { onPreview: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { from?: string } | null;
  const from = state?.from ?? paths.home;

  function startPreview() {
    onPreview();
    void navigate(from, { replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-8">
      <Page title="ログイン" description="ログイン機能は準備中です。">
        {import.meta.env.DEV && (
          <div className="space-y-3 rounded-xl border border-line p-4">
            <p className="text-sm text-muted">開発環境では、各画面の遷移をプレビューできます。</p>
            <button type="button" onClick={startPreview} className="rounded-lg bg-brand hover:bg-brand-hover px-4 py-3 font-medium text-white">
              画面をプレビュー
            </button>
          </div>
        )}
      </Page>
    </main>
  );
}
