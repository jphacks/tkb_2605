let csrfToken = "";
let scope = new AbortController();
let sessionCheck: (() => Promise<void>) | undefined;
let userId: string | null = null;
export const authenticatedUserId = () => userId;
export function setAuthenticatedUserId(value: string | null) { userId = value; }

export function setCsrfToken(token: string) { csrfToken = token; }
export function resetApiSession() {
  scope.abort();
  scope = new AbortController();
  csrfToken = "";
  userId = null;
}
export function onAuthenticationFailure(check: () => Promise<void>) { sessionCheck = check; }

function currentCsrfToken() {
  if (typeof document !== "undefined") {
    const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("csrftoken="));
    if (cookie) {
      try { return decodeURIComponent(cookie.slice("csrftoken=".length)); } catch { /* Use the API token. */ }
    }
  }
  return csrfToken;
}

// Session changes abort old requests. Writes are never replayed automatically.
export async function apiFetch(url: string, init: RequestInit = {}, checkSession = true): Promise<Response> {
  const currentScope = scope;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(init.method ?? "GET")) {
    const token = currentCsrfToken();
    if (token) headers.set("X-CSRFToken", token);
  }
  const signal = AbortSignal.any([currentScope.signal, AbortSignal.timeout(10_000), ...(init.signal ? [init.signal] : [])]);
  const response = await fetch(url, { ...init, headers, credentials: "same-origin", redirect: "error", cache: "no-store", signal });
  if (checkSession && (response.status === 401 || response.status === 403)) await sessionCheck?.();
  currentScope.signal.throwIfAborted();
  return response;
}
