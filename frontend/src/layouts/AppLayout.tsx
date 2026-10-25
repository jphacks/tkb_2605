import { Outlet } from "react-router";

export default function AppLayout({ onExitPreview }: { onExitPreview: () => void }) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Outlet />
      {import.meta.env.DEV && (
        <p className="text-sm text-muted">
          画面プレビュー中です。{" "}
          <button type="button" onClick={onExitPreview} className="underline">プレビューを終了</button>
        </p>
      )}
    </main>
  );
}
