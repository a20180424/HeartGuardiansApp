import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { zoneForPath, type Zone } from "./zone";

// 전역 BGM 재생 컨트롤러.
//
// 라우트(씬) 전환으로 씬 컴포넌트가 언마운트돼도 음악이 끊기지 않도록
// <Routes> 바깥(App 레벨)에 산다. 라우트 경로로 "존"을 판별해 재생을 바꾼다.
//
//  - hub  (/auth, /home)  : bgm-hub.ogg 단일 곡 루프
//  - planet (/planet/*)   : 5곡 플레이리스트(긴 곡부터), 곡끼리 크로스페이드,
//                           마지막 곡 뒤 첫 곡으로 루프. 행성 이동해도 이어서 재생.
//  - silent (/intro, /outro, 그 외) : 무음(동영상은 자체 사운드)
//
// 크로스페이드는 <audio> 2개(deck)를 번갈아 쓰며 볼륨을 램프하는 단순 방식.

// 배경음악 전역 on/off. 일단 기본은 꺼둔다(모든 존에서 무음).
// 다시 켜려면 true로만 바꾸면 hub/planet 재생이 복구된다.
const BGM_ENABLED = false;

const BGM_VOLUME = 0.6; // 배경음이라 풀볼륨보다 낮게
const CROSSFADE_MS = 1000;
const CROSSFADE_SEC = CROSSFADE_MS / 1000;

const asset = (name: string) => `${import.meta.env.BASE_URL}assets/audio/${name}`;
const HUB_SRC = asset("bgm-hub.ogg");
// 재생 순서: 긴 곡부터 (planet-1이 가장 긴 곡)
const PLANET_SRCS = [1, 2, 3, 4, 5].map((n) => asset(`bgm-planet-${n}.ogg`));

export function BgmProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const zone = useMemo(() => zoneForPath(location.pathname), [location.pathname]);

  // deck 2개(크로스페이드용)와 재생 상태는 리렌더와 무관하게 ref로 소유한다.
  const decksRef = useRef<HTMLAudioElement[] | null>(null);
  const activeRef = useRef(0); // 현재 들리는 deck 인덱스(0/1)
  const rampRef = useRef<number | null>(null); // 진행 중인 볼륨 램프 rAF
  const playlistPosRef = useRef(0); // 행성 플레이리스트 현재 위치(세션 내 유지)
  const planetCleanupRef = useRef<(() => void) | null>(null); // planet 스케줄러 해제
  const currentKeyRef = useRef<string>(""); // 지금 재생 목표(중복 적용 방지)
  const armedRef = useRef(false); // 자동재생 차단 대비 제스처 리스너 등록 여부

  // deck을 프로바이더 수명 동안 한 번만 생성(StrictMode 이중 마운트에도 안전).
  function decks(): HTMLAudioElement[] {
    if (!decksRef.current) {
      const mk = () => {
        const a = new Audio();
        a.preload = "auto";
        a.volume = 0;
        return a;
      };
      decksRef.current = [mk(), mk()];
    }
    return decksRef.current;
  }

  // volume은 [0,1] 밖이면 예외를 던지므로 부동소수점 오차를 클램프한다.
  function setVol(deck: HTMLAudioElement, v: number) {
    deck.volume = v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function cancelRamp() {
    if (rampRef.current != null) {
      cancelAnimationFrame(rampRef.current);
      rampRef.current = null;
    }
  }

  // out deck을 페이드아웃하며 in deck을 페이드인. 끝나면 out은 정지.
  function crossfade(outDeck: HTMLAudioElement, inDeck: HTMLAudioElement) {
    cancelRamp();
    const outFrom = outDeck.volume;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / CROSSFADE_MS);
      setVol(inDeck, BGM_VOLUME * t);
      setVol(outDeck, outFrom * (1 - t));
      if (t < 1) {
        rampRef.current = requestAnimationFrame(step);
      } else {
        rampRef.current = null;
        if (outDeck !== inDeck) outDeck.pause();
      }
    };
    rampRef.current = requestAnimationFrame(step);
  }

  // 자동재생이 막히면 첫 사용자 제스처에서 active deck 재생을 재시도한다.
  function armAutoplay() {
    if (armedRef.current) return;
    armedRef.current = true;
    const resume = () => {
      const deck = decks()[activeRef.current];
      deck.play().catch(() => {});
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      window.removeEventListener("touchstart", resume);
      armedRef.current = false;
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    window.addEventListener("touchstart", resume);
  }

  // 지정 소스를 inactive deck에 실어 재생 → 크로스페이드 → active 전환.
  function crossfadeTo(src: string, loop: boolean) {
    const d = decks();
    const active = d[activeRef.current];
    const inactive = d[1 - activeRef.current];
    inactive.src = src;
    inactive.loop = loop;
    inactive.currentTime = 0;
    inactive.volume = 0;
    inactive.play().catch(() => armAutoplay());
    crossfade(active, inactive);
    activeRef.current = 1 - activeRef.current;
  }

  function crossfadeToSilence() {
    cancelRamp();
    const active = decks()[activeRef.current];
    const from = active.volume;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / CROSSFADE_MS);
      setVol(active, from * (1 - t));
      if (t < 1) {
        rampRef.current = requestAnimationFrame(step);
      } else {
        rampRef.current = null;
        active.pause();
      }
    };
    rampRef.current = requestAnimationFrame(step);
  }

  function clearPlanetSchedule() {
    planetCleanupRef.current?.();
    planetCleanupRef.current = null;
  }

  // 현재 위치의 행성 곡을 재생하고, 끝나기 CROSSFADE_SEC 전에 다음 곡으로 넘긴다.
  function startPlanetTrack() {
    clearPlanetSchedule();
    const src = PLANET_SRCS[playlistPosRef.current];
    currentKeyRef.current = `planet:${playlistPosRef.current}`;
    crossfadeTo(src, false);
    const deck = decks()[activeRef.current];
    const onTick = () => {
      if (!deck.duration || Number.isNaN(deck.duration)) return;
      if (deck.currentTime >= deck.duration - CROSSFADE_SEC) {
        clearPlanetSchedule();
        playlistPosRef.current = (playlistPosRef.current + 1) % PLANET_SRCS.length;
        startPlanetTrack();
      }
    };
    deck.addEventListener("timeupdate", onTick);
    planetCleanupRef.current = () => deck.removeEventListener("timeupdate", onTick);
  }

  function applyZone(z: Zone) {
    if (!BGM_ENABLED) z = "silent"; // 전역 off면 어떤 존이든 무음 처리
    if (z === "hub") {
      if (currentKeyRef.current === "hub") return;
      clearPlanetSchedule();
      currentKeyRef.current = "hub";
      crossfadeTo(HUB_SRC, true);
    } else if (z === "planet") {
      // planet 존 안에서 행성 간 이동은 zone이 안 바뀌어 이 함수가 재호출되지 않는다.
      // (효과 의존성이 [zone]이라 이어서 재생됨)
      if (currentKeyRef.current.startsWith("planet:")) return;
      startPlanetTrack();
    } else {
      if (currentKeyRef.current === "silent") return;
      clearPlanetSchedule();
      currentKeyRef.current = "silent";
      crossfadeToSilence();
    }
  }

  useEffect(() => {
    applyZone(zone);
    // zone이 실제로 바뀔 때만 재적용. 같은 존 내 라우트 변경엔 반응하지 않음.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone]);

  // 언마운트 시 정리(핫리로드/앱 종료 대비).
  useEffect(() => {
    return () => {
      cancelRamp();
      clearPlanetSchedule();
      decksRef.current?.forEach((a) => {
        a.pause();
        a.src = "";
      });
      // deck을 비웠으니 재적용 가드도 리셋 → 재마운트(StrictMode 포함) 시 다시 세팅됨.
      currentKeyRef.current = "";
    };
  }, []);

  return <>{children}</>;
}
