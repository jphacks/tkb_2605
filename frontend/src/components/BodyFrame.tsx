import type { ReactNode } from "react";

export default function BodyFrame({ head, children, busy = false }: { head: ReactNode; children: ReactNode; busy?: boolean }) {
  return <div className="body-navigation">
    <svg className="body-lines upper-body" viewBox="0 0 640 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path className="body-fill" d="M296 52v30c-28 8-73 9-140 12-35 2-57 3-71 6h470c-14-3-36-4-71-6-67-3-112-4-140-12V52Z" />
      <path d="M296 52v30c-28 8-73 9-140 12-35 2-57 3-71 6M344 52v30c28 8 73 9 140 12 35 2 57 3 71 6M296 84l24 12 24-12M320 96v4" />
    </svg>
    <div className="head-avatar">{head}</div>
    <div className="chest-region">
      <svg className="body-lines" viewBox="0 0 640 64" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path className="body-fill" d="M85 0h470l25 64H60Z" />
        <path d="M85 0 60 64M555 0l25 64M320 0v58" />
      </svg>
      <div className="chest-actions" aria-busy={busy}>{children}</div>
    </div>
  </div>;
}
