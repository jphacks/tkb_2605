import { useSyncExternalStore } from "react";
import { getAuthState, subscribeAuth } from "./session.ts";
export function useAuth() { return useSyncExternalStore(subscribeAuth, getAuthState); }
