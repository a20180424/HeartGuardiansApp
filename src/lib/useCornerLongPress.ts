import { useEffect, useRef } from "react";

// 히든 메뉴 진입 제스처: 화면 좌상단 모서리를 두 손가락으로 길게 누른다.
// 태블릿엔 키보드가 없어 히든 "키"는 터치 제스처여야 한다. 아이가 우연히
// 두 손가락 롱프레스를 할 확률은 거의 없고, 게임 속 탭·드래그와도 겹치지 않는다.
// 좌표는 실제 뷰포트 기준이다 — 이 훅은 무대(FixedStage/#stage) 바깥에서 돈다.

const CORNER_PX = 100; // 좌상단 감지 정사각형 한 변
const HOLD_MS = 2000; // 두 손가락을 유지해야 하는 시간
const MOVE_TOLERANCE_PX = 24; // 이만큼 움직이면 취소(스크롤·드래그 오인 방지)

export function useCornerLongPress(onTrigger: () => void): void {
  // 콜백을 ref에 담아 리스너를 매 렌더 다시 붙이지 않는다.
  const cb = useRef(onTrigger);
  cb.current = onTrigger;

  useEffect(() => {
    const points = new Map<number, { x: number; y: number }>();
    let timer: number | undefined;

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.clientX > CORNER_PX || e.clientY > CORNER_PX) return;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size === 2 && timer === undefined) {
        timer = window.setTimeout(() => {
          timer = undefined;
          points.clear();
          cb.current();
        }, HOLD_MS);
      }
    };

    const onMove = (e: PointerEvent) => {
      const start = points.get(e.pointerId);
      if (!start) return;
      const moved =
        Math.abs(e.clientX - start.x) > MOVE_TOLERANCE_PX ||
        Math.abs(e.clientY - start.y) > MOVE_TOLERANCE_PX;
      if (moved) {
        points.delete(e.pointerId);
        clearTimer();
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!points.delete(e.pointerId)) return;
      clearTimer();
    };

    // 캡처 단계로 듣되 아무것도 삼키지 않는다 — 감지만 하고 이벤트는 그대로 흘린다.
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    return () => {
      clearTimer();
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    };
  }, []);

  // 브라우저 개발용 단축키(Ctrl+Alt+J). 제스처와 완전히 동일한 흐름을 연다(PIN도 동일하게 요구).
  // 태블릿엔 키보드가 없어 실질적으로 개발용이다.
  //
  // Ctrl+Shift+J 는 쓰지 않는다 — 브라우저의 DevTools 콘솔 단축키라 페이지가 받지 못한다.
  // (개발 PC에서 실측: Ctrl+Shift+J 는 Control·Shift 의 keydown 만 도착하고 J 는 아예 오지
  //  않는다. 같은 Ctrl+Shift 라도 Y 는 정상 도착하므로 조합이 아니라 J 가 가로채이는 것이다.)
  // Alt+Shift+J 도 피한다 — Alt+Shift 가 Windows 입력 언어 전환 단축키다.
  //
  // 판정은 e.key 가 아니라 e.code 로 한다: e.key 는 수식키·IME 에 따라 "j"/"J"/"ㅓ" 로 달라지지만
  // e.code 는 물리 키 기준이라 자판 배열·한글 입력 상태와 무관하다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.code === "KeyJ") {
        e.preventDefault();
        cb.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
