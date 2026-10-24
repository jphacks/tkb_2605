import type { CSSProperties } from "react";

const paths = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  settings: <><path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 3h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-3Z" /><circle cx="11.5" cy="11.5" r="3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  "arrow-left": <path d="m12 5-7 7 7 7M5 12h15" />,
  "arrow-right": <path d="m12 5 7 7-7 7M4 12h15" />,
  dumbbell: <><path d="m7 7 10 10M5 3l4 4-2 2-4-4ZM15 15l2-2 4 4-2 2ZM3 9l6-6M15 21l6-6M2 6l4-4M18 22l4-4" /></>,
  sparkles: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4M18 4h4" /></>,
  message: <path d="M21 11a9 9 0 0 1-9 9H4l-2 2V11a9.5 9.5 0 0 1 19 0Z" />,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  logout: <><path d="M9 3H4v18h5M10 12h11m-4-4 4 4-4 4" /></>,
  leaf: <><path d="M20 3C7 1 1 10 6 17s17 2 14-14ZM5 21 16 9" /></>,
};

export function Icon({ name, size = 22, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
