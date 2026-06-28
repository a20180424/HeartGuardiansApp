// Game progress + planet reviews (all authenticated).
// See API spec: /api/progress, /api/progress/{planet}, /api/planet-reviews

import { request, authHeaders } from "./api";

export interface PlanetReview {
  id: string;
  planet: number; // 1-4
  content: string;
  created_at: string;
}

export interface ProgressResponse {
  progress: number; // 0-4, highest planet cleared
}

export interface CompletePlanetResponse {
  progress: number;
  review: PlanetReview;
}

/** Highest planet the student has cleared (0-4). */
export function getProgress(): Promise<ProgressResponse> {
  return request<ProgressResponse>("/api/progress", { headers: authHeaders() });
}

/** Mark a planet (1-4) cleared with a short review; returns updated progress. */
export function completePlanet(planet: number, review: string): Promise<CompletePlanetResponse> {
  return request<CompletePlanetResponse>(`/api/progress/${planet}`, {
    method: "PUT",
    headers: authHeaders(),
    body: { review },
  });
}

/** List the student's planet reviews. */
export function getPlanetReviews(): Promise<PlanetReview[]> {
  return request<PlanetReview[]>("/api/planet-reviews", { headers: authHeaders() });
}
