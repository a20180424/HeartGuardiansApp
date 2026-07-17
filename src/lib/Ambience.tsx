import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { audio } from "./audio";
import { zoneForPath } from "./zone";

// 존에 따라 합성 앰비언스 패드를 켜고 끈다. BgmProvider 와 같은 결로 <Routes> 바깥에 산다.
//
// 마음에 들지 않으면 이 상수 하나만 false 로 바꾼다 — BGM_ENABLED 와 같은 방식.
const AMBIENCE_ENABLED = true;

// 존별로 기본 주파수만 다르다. 멜로디가 아니라 공간감이라 화음까지 갈 필요가 없다.
const PAD: Record<string, number[]> = {
  hub: [110, 164.81], // A2 + E3 — 허브는 차분하게
  planet: [98, 146.83], // G2 + D3 — 행성은 조금 더 낮고 넓게
};

export default function Ambience(): null {
  const { pathname } = useLocation();
  const zone = zoneForPath(pathname);

  useEffect(() => {
    if (!AMBIENCE_ENABLED) return;
    const freqs = PAD[zone];
    if (freqs) audio.startPad(freqs);
    else audio.stopPad(); // silent 존(인트로·아웃트로) — 동영상 자체 사운드를 방해하지 않는다
    return () => audio.stopPad();
  }, [zone]);

  return null;
}
