import { useSyncExternalStore } from "react";
import { arePreviewMasmates, subscribePreviewMasmates } from "./masmates.ts";

export function usePreviewMasmates(firstId: string, secondId: string) {
  return useSyncExternalStore(subscribePreviewMasmates, () => arePreviewMasmates(firstId, secondId));
}
