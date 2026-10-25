import { useSyncExternalStore } from "react";
import { getCurrentProfile, subscribeCurrentProfile } from "./currentProfile.ts";
export function useCurrentProfile() { return useSyncExternalStore(subscribeCurrentProfile, getCurrentProfile); }
