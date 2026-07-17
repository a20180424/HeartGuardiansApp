/* 경로 → 사운드 "존". bgm 과 앰비언스가 공유한다.
 *
 *  hub    (/auth, /home)      : 허브
 *  planet (/planet/*)         : 행성·미션
 *  silent (/intro, /outro, 그 외) : 무음 — 동영상은 자체 사운드가 있다 */

export type Zone = "hub" | "planet" | "silent";

export function zoneForPath(pathname: string): Zone {
  if (pathname.startsWith("/planet")) return "planet";
  if (pathname === "/auth" || pathname === "/home") return "hub";
  return "silent";
}
