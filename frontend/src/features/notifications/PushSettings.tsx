import { useCallback, useEffect, useRef, useState } from "react";
import { disablePush, enablePush, preparePush, pushSupported, savePushSubscription } from "./push.ts";

type Setup = Awaited<ReturnType<typeof preparePush>>;
const message = (error: unknown) => error instanceof Error ? error.message : "接続を確認して再試行してください。";

export default function PushSettings() {
  const [supported] = useState(pushSupported);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(supported);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const locked = useRef(false);
  const mounted = useRef(true);
  const load = useCallback(async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(""); setRegistered(false); setSetup(null);
    try {
      // Read an existing endpoint before fetching config so it can be revoked even during downtime.
      const previous = await navigator.serviceWorker.getRegistration("/");
      const previousSubscription = await previous?.pushManager.getSubscription() ?? null;
      if (mounted.current) setSubscription(previousSubscription);
      const next = await preparePush();
      if (!mounted.current) return;
      setSetup(next);
      const existing = await next.registration.pushManager.getSubscription();
      if (mounted.current) setSubscription(existing);
      if (Notification.permission === "denied") throw new Error("通知がブラウザーでブロックされています。サイト設定から通知を許可してください。");
      if (existing && Notification.permission !== "granted") throw new Error("通知の許可を確認できません。この端末の通知を解除してから、もう一度有効にしてください。");
      if (existing) await savePushSubscription(existing, next.config);
      if (mounted.current) setRegistered(!!existing);
    } catch (cause) { if (mounted.current) setError(message(cause)); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => { if (supported) void load(); }, 0);
    const recheck = () => { if (supported && document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      mounted.current = false; clearTimeout(timer);
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [supported, load]);

  async function toggle() {
    if ((!setup && !subscription) || locked.current) return;
    locked.current = true; setBusy(true); setError(""); setFeedback("");
    try {
      if (subscription) {
        const removed = await disablePush(subscription, setup?.config ?? null);
        if (mounted.current) {
          setSubscription(null); setRegistered(false);
          setFeedback(removed ? "この端末のプッシュ通知を停止しました。" : "この端末の通知を停止しました。サーバーの登録情報はまだ削除できていません。");
        }
      } else if (setup) {
        // Direct click handler, before awaiting any network or worker operation (including iOS).
        const permission = Notification.requestPermission();
        const next = await enablePush(setup.registration, setup.config, permission);
        if (mounted.current) { setSubscription(next); setRegistered(true); setFeedback("この端末でプッシュ通知を受け取れます。"); }
      }
    } catch (cause) { if (mounted.current) setError(message(cause)); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }

  return <section className="push-settings" aria-labelledby="push-title">
    <div className="push-heading"><h2 id="push-title">端末へのプッシュ通知</h2><span>{busy ? "確認中" : registered ? "オン" : subscription ? "登録を要確認" : "オフ"}</span></div>
    <p>アプリを開いていないときも、この端末に新しい筋トレ通知をお知らせします。</p>
    {!supported ? <p role="status">この環境ではプッシュ通知を利用できません。対応ブラウザーのHTTPSページで開いてください。</p> : <>
      <button type="button" className="push-action" disabled={busy || (!setup && !subscription)} onClick={() => void toggle()}>{busy ? "設定を確認中…" : subscription ? "この端末の通知を解除" : "プッシュ通知を有効にする"}</button>
      {error && <div className="push-error" role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={() => void load()}>設定を再確認</button></div>}
      <p role="status">{feedback}</p>
    </>}
    <p className="push-help">iPhone・iPadでは、共有メニューから「ホーム画面に追加」して、そのアイコンから開いてください。通知を拒否した場合はブラウザーや端末の設定で変更できます。</p>
  </section>;
}
