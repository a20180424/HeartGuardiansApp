// Auth flow built on the Bearer-token API client.
// The Workers API implements auth itself (custom), so these endpoints/shapes are
// placeholders — adjust paths and response fields to match the actual API.

import { apiGet, apiPost, tokenStore } from "./api";

export interface AuthUser {
  id: string;
  username: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await apiPost<AuthResponse>("/auth/login", { username, password }, { anonymous: true });
  tokenStore.set(res.token);
  return res.user;
}

export async function signup(username: string, password: string): Promise<AuthUser> {
  const res = await apiPost<AuthResponse>("/auth/signup", { username, password }, { anonymous: true });
  tokenStore.set(res.token);
  return res.user;
}

export function logout(): void {
  tokenStore.clear();
}

export function isLoggedIn(): boolean {
  return tokenStore.get() !== null;
}

/** Fetch the current user using the stored token; returns null if unauthenticated. */
export async function me(): Promise<AuthUser | null> {
  if (!isLoggedIn()) return null;
  try {
    return await apiGet<AuthUser>("/auth/me");
  } catch {
    return null;
  }
}
