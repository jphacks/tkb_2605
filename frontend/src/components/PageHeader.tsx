import { Link } from "react-router";
import { Icon } from "./Icon.tsx";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className="page-header">
    <Link className="icon-button back-link" to="/" aria-label="ホームに戻る"><Icon name="arrow-left" /></Link>
    <div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>
  </header>;
}
