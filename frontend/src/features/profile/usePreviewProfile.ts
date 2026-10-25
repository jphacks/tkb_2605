import { useSyncExternalStore } from "react";
import { getPreviewProfile, subscribePreviewProfile } from "./preview.ts";
export function usePreviewProfile() { return useSyncExternalStore(subscribePreviewProfile, getPreviewProfile); }
