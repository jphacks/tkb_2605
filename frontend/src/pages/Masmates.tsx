import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { becomeMasmates, findPeople, type Profile } from "../api/profiles.ts";
import { Avatar } from "../components/Avatar.tsx";
import { profilePath, paths } from "../routes.ts";
import "../features/profile/profile.css";

function Person({ profile }: { profile: Profile }) {
  const [person, setPerson] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function add() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try { setPerson(await becomeMasmates(person.user_id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "追加できませんでした。"); }
    finally { locked.current = false; setBusy(false); }
  }
  return <li className="person-card">
    <Avatar user={{ id: person.user_id, name: person.user_name, bio: person.bio, color: person.avatar_color, avatar: "mint" }} />
    <div className="person-info"><Link to={profilePath(person.user_id)}>{person.user_name}</Link><p>{person.bio || "自己紹介はまだありません。"}</p>{error && <p role="alert" className="profile-form-error">{error}</p>}</div>
    <button className="profile-action" disabled={busy || person.is_masmate} onClick={() => void add()}>{busy ? "追加中…" : person.is_masmate ? "マスメイト" : "マスメイトになる"}</button>
  </li>;
}
function Results({ query, masmates }: { query: string; masmates: boolean }) {
  const [items, setItems] = useState<Profile[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController(); request.current = controller;
    findPeople({ query, masmates, signal: controller.signal }).then((page) => {
      if (!controller.signal.aborted) { setItems(page.results); setNext(page.next_offset); }
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "検索できませんでした。"); }).finally(() => { if (!controller.signal.aborted) { setLoading(false); request.current = null; } });
    return () => { mounted.current = false; request.current?.abort(); };
  }, [query, masmates]);
  async function more() {
    if (next === null || request.current) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const page = await findPeople({ query, masmates, offset: next, signal: controller.signal });
      if (mounted.current && !controller.signal.aborted) {
        setItems((old) => [...new Map([...old, ...page.results].map((item) => [item.user_id, item])).values()]);
        setNext(page.next_offset);
      }
    } catch (cause) { if (mounted.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "検索できませんでした。"); }
    finally { if (mounted.current && !controller.signal.aborted) { setLoading(false); request.current = null; } }
  }
  return <div aria-busy={loading}>
    <ul className="people-list">{items.map((person) => <Person key={person.user_id} profile={person} />)}</ul>
    {loading && <p className="profile-empty" role="status">読み込んでいます…</p>}
    {error && <div className="profile-empty"><p role="alert">{error}</p><button className="profile-action" disabled={loading} onClick={() => void more()}>再試行</button></div>}
    {!loading && !error && !items.length && <p className="profile-empty">{query ? "一致するユーザーが見つかりませんでした。" : masmates ? "まだマスメイトがいません。「ユーザーを探す」から仲間を見つけましょう。" : "まだほかのユーザーがいません。"}</p>}
    {!loading && !error && next !== null && <div className="profile-empty"><button className="profile-action" onClick={() => void more()}>もっと見る</button></div>}
  </div>;
}
export default function Masmates() {
  const [masmates, setMasmates] = useState(true);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  function search(event: FormEvent) { event.preventDefault(); setQuery(input.trim()); }
  return <section className="profile-page people-page">
    <header className="profile-topbar"><Link to={paths.home}>← ホーム</Link><h1>マスメイト<span>MASMATES</span></h1></header>
    <div className="feed-tabs" role="group" aria-label="ユーザーの表示切り替え"><button className={masmates ? "active" : ""} aria-pressed={masmates} onClick={() => setMasmates(true)}>マスメイト</button><button className={!masmates ? "active" : ""} aria-pressed={!masmates} onClick={() => setMasmates(false)}>ユーザーを探す</button></div>
    <form className="people-search" onSubmit={search}><label><span className="visually-hidden">名前で検索</span><input type="search" maxLength={50} value={input} onChange={(event) => setInput(event.target.value)} placeholder="名前で検索" /></label><button className="profile-action" type="submit">検索</button></form>
    <p className="profile-sample-notice">どちらかが追加すると、お互いにマスメイトになります。</p>
    <Results key={JSON.stringify([masmates, query])} query={query} masmates={masmates} />
  </section>;
}
