import type { ProfileSample } from "./samples.ts";

export function ProfileAvatar({ user, large = false }: { user: ProfileSample; large?: boolean }) {
  return <span className={"profile-avatar" + (large ? " profile-avatar-large" : "")} style={{ backgroundColor: user.color }} role="img" aria-label={user.name + "のアイコン（サンプル）"}>
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M10 80c1-21 13-29 30-29s29 8 30 29" fill="var(--brand)" />
      <path d="M31 47h18v14c-5 6-13 6-18 0" fill="#dca889" />
      <ellipse cx="40" cy="33" rx="18" ry="22" fill="#efc3a5" />
      <path d="M21 34C15 7 37 4 48 11c13 1 16 14 11 25l-5-15c-9 7-17 5-23 0l-7 14Z" fill="#343a30" />
      <path d="M32 35h1m14 0h1" stroke="#343a30" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 45q4 3 8 0" fill="none" stroke="#a26754" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </span>;
}
