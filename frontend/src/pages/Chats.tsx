import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import Page from "../components/Page.tsx";
import { paths } from "../routes.ts";

type Message = { id: string; name: string; text: string; mine: boolean; time: string };
type Chat = { id: string; name: string; members: string[]; unread: number; messages: Message[] };
const initialChats: Chat[] = [
  { id: "club", name: "みんなの筋トレ部", members: ["ユウ", "ハル", "ミオ", "レン"], unread: 2, messages: [
    { id: "c1", name: "ハル", text: "今日もトレーニングおつかれさま！", mine: false, time: "2026-10-24T09:00:00+09:00" },
    { id: "c2", name: "ミオ", text: "朝のランニング、気持ちよかったです。", mine: false, time: "2026-10-24T09:02:00+09:00" },
    { id: "c3", name: "ユウ", text: "いいですね！今日は自分も少し体を動かします。", mine: true, time: "2026-10-24T09:05:00+09:00" },
    { id: "c4", name: "レン", text: "一緒に続けられる仲間がいると心強いです！", mine: false, time: "2026-10-24T09:10:00+09:00" },
  ] },
  { id: "haru", name: "ハル", members: ["ユウ", "ハル"], unread: 1, messages: [
    { id: "h1", name: "ハル", text: "今週のトレーニングはどうだった？", mine: false, time: "2026-10-24T08:30:00+09:00" },
    { id: "h2", name: "ユウ", text: "少しずつ続けられています！", mine: true, time: "2026-10-24T08:35:00+09:00" },
  ] },
  { id: "morning", name: "朝活トレーニング", members: ["ユウ", "ミオ", "レン"], unread: 0, messages: [
    { id: "m1", name: "ミオ", text: "明日も自分のペースで、よい朝を。", mine: false, time: "2026-10-23T20:00:00+09:00" },
  ] },
];

export default function Chats() {
  const [chats, setChats] = useState(initialChats);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const selected = chats.find((chat) => chat.id === selectedId);
  const draft = selectedId ? drafts[selectedId] ?? "" : "";
  const log = useRef<HTMLDivElement>(null);
  const messageCount = selected?.messages.length ?? 0;
  const filtered = chats.filter((chat) => (!unreadOnly || chat.unread > 0) &&
    [chat.name, ...chat.members].join(" ").toLocaleLowerCase("ja-JP").includes(query.trim().toLocaleLowerCase("ja-JP")));
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [selectedId, messageCount]);

  function select(id: string) {
    setSelectedId(id);
    setChats((items) => items.map((chat) => chat.id === id ? { ...chat, unread: 0 } : chat));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !draft.trim() || draft.length > 500) return;
    const message: Message = { id: crypto.randomUUID(), name: "ユウ", text: draft.trim(), mine: true, time: new Date().toISOString() };
    setChats((items) => items.map((chat) => chat.id === selectedId ? { ...chat, messages: [...chat.messages, message] } : chat));
    setDrafts((items) => ({ ...items, [selectedId]: "" }));
  }

  return (
    <>
      <Link to={paths.home} className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800 hover:underline">← ホーム</Link>
      <Page title="チャット" description="仲間と声をかけ合って、毎日の一歩を。">
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">サンプル会話のプレビューです。追加したメッセージは相手に送信されず、リロードすると元に戻ります。</p>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className={(selected ? "hidden md:block " : "") + "border-gray-200 md:border-r"} aria-label="チャット一覧">
            <div className="space-y-3 border-b border-gray-100 p-4">
              <label className="block"><span className="sr-only">チャットを検索</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前やメンバーを検索" className="min-h-11 w-full min-w-0 rounded-xl border border-gray-300 px-3 text-base" /></label>
              <div className="flex gap-2" role="group" aria-label="チャットの表示"><button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)} className={(!unreadOnly ? "bg-emerald-800 text-white " : "bg-gray-100 text-gray-600 ") + "min-h-10 rounded-full px-4 text-xs font-semibold"}>すべて</button><button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)} className={(unreadOnly ? "bg-emerald-800 text-white " : "bg-gray-100 text-gray-600 ") + "min-h-10 rounded-full px-4 text-xs font-semibold"}>未読</button></div>
            </div>
            <ul className="divide-y divide-gray-100">{filtered.map((chat) => <li key={chat.id}><button type="button" onClick={() => select(chat.id)} aria-current={selectedId === chat.id ? "true" : undefined} className={(selectedId === chat.id ? "bg-emerald-50 " : "hover:bg-stone-50 ") + "flex w-full items-start gap-3 p-4 text-left"} aria-label={chat.name + "を開く"}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800" aria-hidden="true">{chat.name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="truncate text-sm">{chat.name}</strong>{chat.unread > 0 && <span className="ml-auto rounded-full bg-emerald-800 px-2 text-xs text-white" aria-label={chat.unread + "件未読"}>{chat.unread}</span>}</span><span className="mt-1 block truncate text-xs leading-6 text-gray-500">{chat.messages.at(-1)?.text}</span></span>
            </button></li>)}</ul>
            {!filtered.length && <p className="p-6 text-center text-sm leading-6 text-gray-500">{unreadOnly ? "該当する未読チャットはありません。" : "チャットが見つかりません。"}</p>}
          </aside>
          <section className={(selected ? "flex " : "hidden md:flex ") + "min-w-0 flex-col"} aria-label="会話プレビュー">
            {selected ? <>
              <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-4"><button type="button" className="min-h-11 min-w-11 rounded-lg text-emerald-800 md:hidden" aria-label="チャット一覧に戻る" onClick={() => setSelectedId(null)}>←</button><div className="min-w-0"><h2 className="truncate font-bold">{selected.name}</h2><p className="mt-1 truncate text-xs text-gray-500">{selected.members.length}人 · {selected.members.join("、")}</p></div></header>
              <div ref={log} role="log" aria-label={selected.name + "のメッセージ"} aria-live="polite" className="max-h-[48dvh] min-h-64 space-y-4 overflow-y-auto bg-stone-50 p-4">
                {selected.messages.map((message) => <div key={message.id} className={"flex flex-col " + (message.mine ? "items-end" : "items-start")}><p className="mb-1 text-xs text-gray-500">{message.mine ? "あなた" : message.name}</p><p className={(message.mine ? "bg-emerald-800 text-white " : "border border-gray-200 bg-white text-gray-800 ") + "max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-7"}>{message.text}</p><time dateTime={message.time} className="mt-1 text-[10px] text-gray-500">{new Date(message.time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</time></div>)}
              </div>
              <form onSubmit={submit} className="space-y-3 border-t border-gray-100 p-4"><label className="block"><span className="sr-only">メッセージ</span><textarea rows={2} maxLength={500} value={draft} onChange={(event) => setDrafts((items) => ({ ...items, [selected.id]: event.target.value }))} placeholder="応援やひとことを入力" className="w-full resize-y rounded-xl border border-gray-300 px-3 py-2 text-base" /></label><div className="flex items-center justify-between gap-3"><span className="text-xs text-gray-500">{draft.length} / 500</span><button type="submit" disabled={!draft.trim()} className="min-h-11 rounded-xl bg-emerald-800 px-4 text-xs font-semibold text-white disabled:opacity-40">プレビューに追加</button></div></form>
            </> : <div className="flex min-h-96 flex-1 flex-col items-center justify-center gap-3 p-6 text-center"><span className="grid size-16 place-items-center rounded-full bg-emerald-50 text-3xl text-emerald-800" aria-hidden="true">···</span><h2 className="font-bold text-gray-800">チャットを選んでみよう</h2><p className="text-sm text-gray-500">左の一覧から会話を開けます。</p></div>}
          </section>
        </div>
      </Page>
    </>
  );
}
