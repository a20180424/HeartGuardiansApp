// Account / credential endpoints (public + profile).
// See API spec: /api/schools, /api/auth/signup, /api/auth/verify, /api/me

import { request, authHeaders, credentialStore, type Credentials } from "./api";

export type Gender = "male" | "female";

export interface School {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
  gender: Gender;
  school: School | null;
}

export interface SignupBody extends Credentials {
  name: string;
  gender: Gender;
}

/** Public: list of schools (to populate the signup/login school picker). */
export function getSchools(): Promise<School[]> {
  return request<School[]>("/api/schools");
}

/** Public: register a new student. Does not store credentials by itself. */
export function signup(body: SignupBody): Promise<unknown> {
  return request("/api/auth/signup", { method: "POST", body });
}

/** Public: verify credentials. On success, stores them for subsequent calls. */
export async function verify(creds: Credentials): Promise<Profile> {
  const profile = await request<Profile>("/api/auth/verify", { method: "POST", body: creds });
  credentialStore.set(creds);
  return profile;
}

/** Authenticated: current profile (uses stored credentials). */
export function getProfile(): Promise<Profile> {
  return request<Profile>("/api/me", { headers: authHeaders() });
}

/** Authenticated: delete the account, then clear stored credentials. */
export async function deleteAccount(): Promise<void> {
  await request("/api/me", { method: "DELETE", headers: authHeaders() });
  credentialStore.clear();
}

export function hasCredentials(): boolean {
  return credentialStore.get() !== null;
}

export function logout(): void {
  credentialStore.clear();
}
