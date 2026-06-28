// Central API client for the HeartGuardians Workers backend (educational PoC).
//
// Auth model (per the API's OpenAPI spec): there is NO session/token. Every
// protected request carries the student's credentials as headers:
//   x-school-id, x-grade, x-class, x-number, x-pin
// We store those credentials locally and attach them on each call.
//
// The API is always a separate origin (on the APK the WebView origin is
// https://localhost / capacitor://localhost), so we always use the absolute
// VITE_API_URL — never relative paths. Web and APK then behave identically.

const API_BASE: string = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

if (!API_BASE && import.meta.env.DEV) {
  console.warn("[api] VITE_API_URL is not set — API calls will fail. Check your .env files.");
}

// --- Credentials (the "auth key") -------------------------------------------
// Matches VerifyBody in the API spec.
export interface Credentials {
  school_id: string;
  grade: number;
  class: number;
  number: number;
  pin: string;
}

const CRED_KEY = "hg.credentials";

export const credentialStore = {
  get(): Credentials | null {
    try {
      const raw = localStorage.getItem(CRED_KEY);
      return raw ? (JSON.parse(raw) as Credentials) : null;
    } catch {
      return null;
    }
  },
  set(creds: Credentials): void {
    try {
      localStorage.setItem(CRED_KEY, JSON.stringify(creds));
    } catch {
      /* storage unavailable — ignore */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(CRED_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Build the x-* auth headers from the given (or stored) credentials. */
export function authHeaders(creds: Credentials | null = credentialStore.get()): Record<string, string> {
  if (!creds) throw new ApiError(401, "No stored credentials", null);
  return {
    "x-school-id": creds.school_id,
    "x-grade": String(creds.grade),
    "x-class": String(creds.class),
    "x-number": String(creds.number),
    "x-pin": creds.pin,
  };
}

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

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** JSON-serializable request body; sets Content-Type automatically. */
  body?: unknown;
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = opts;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
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
    // The API returns { error: string } on failures.
    const msg =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : res.statusText || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, parsed);
  }

  return parsed as T;
}
