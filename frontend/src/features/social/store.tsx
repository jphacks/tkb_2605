import { useState, type ReactNode } from "react";
import { createSocialStore, SocialContext } from "./useSocial.ts";

export function SocialProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createSocialStore);
  return <SocialContext.Provider value={store}>{children}</SocialContext.Provider>;
}
