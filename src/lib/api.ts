// Central API client for the HeartGuardians Workers backend.
//
// Design notes (why it looks like this):
// - The API is ALWAYS a separate origin. On the web the app runs at the Pages
//   domain; inside the APK the WebView origin is https://localhost (Android) or
//   capacitor://localhost (iOS). So we never use relative paths — every call goes
//   to the absolute VITE_API_URL. Web and APK then behave identically.
// - Auth uses a Bearer token (not cookies), because cross-origin cookies are
//   painful in a Capacitor WebView. The token is sent in the Authorization header.
// - Token storage is abstracted so it can be swapped for @capacitor/preferences or
//   a secure storage plugin later without touching call sites.

const API_BASE: string = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

if (!API_BASE && import.meta.env.DEV) {
  // Surface misconfiguration early during development.
  console.warn("[api] VITE_API_URL is not set — API calls will fail. Check your .env files.");
}

// --- Token storage -----------------------------------------------------------
// localStorage works in both the browser and the Capacitor WebView and persists
// across launches. Swap this single object for Capacitor Preferences/secure
// storage later if stronger guarantees are needed.
const TOKEN_KEY = "hg.auth.token";

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable — ignore */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

// --- Core request helper -----------------------------------------------------
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface ApiOptions extends Omit<RequestInit, "body"> {
  /** JSON-serializable request body; sets Content-Type automatically. */
  body?: unknown;
  /** Skip attaching the Authorization header even if a token exists. */
  anonymous?: boolean;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, anonymous, headers, ...rest } = opts;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (!anonymous) {
    const token = tokenStore.get();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await res.text();
  let parsed: unknown = undefined;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : res.statusText) || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, parsed);
  }

  return parsed as T;
}

// Convenience verbs.
export const apiGet = <T = unknown>(path: string, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "GET" });
export const apiPost = <T = unknown>(path: string, body?: unknown, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "POST", body });
