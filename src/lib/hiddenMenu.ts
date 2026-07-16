// 히든 점프 메뉴(교사 시연용)의 잠금 상태. 학생에게 노출되면 안 된다.
//
// - PIN은 빌드 타임에 VITE_HG_MENU_PIN으로 주입한다(.env.local, gitignored).
//   VITE_ 접두어라 번들에 인라인된다 — APK를 뜯으면 보인다. 위협 모델은 교실의
//   초등학생이지 리버서가 아니므로 수용한다.
// - fail closed: PIN이 없거나 4자리가 아니면 프로덕션에서 메뉴가 열리지 않는다.
//   기본 PIN 상수를 두지 않는다 — 소스에 공개된 백도어가 되고, 아무도 env를
//   설정하지 않는 미래를 부른다.
// - 해제 상태는 모듈 변수에만 둔다. localStorage에 남기면 영구 해제되어 학생에게
//   노출된다. APK 재실행 = 새 웹뷰 = 자동 잠김.

let unlocked = false;

/** 빌드에 주입된 PIN. 4자리 숫자가 아니면 null(= 메뉴 사용 불가). */
export function configuredPin(): string | null {
  const raw = import.meta.env.VITE_HG_MENU_PIN;
  return typeof raw === "string" && /^\d{4}$/.test(raw) ? raw : null;
}

/** 이 빌드에서 메뉴를 열 수 있는지. DEV는 PIN 없이도 연다. */
export function isMenuAvailable(): boolean {
  return import.meta.env.DEV || configuredPin() !== null;
}

/** 현재 세션이 해제되었는지. devJump가 점프 파라미터 허용 여부를 판단할 때 쓴다. */
export function isUnlocked(): boolean {
  return unlocked;
}

/** PIN이 맞으면 해제하고 true. 틀리거나 PIN 미설정이면 false(fail closed). */
export function unlock(pin: string): boolean {
  const expected = configuredPin();
  if (expected === null) return false;
  if (pin !== expected) return false;
  unlocked = true;
  return true;
}

/** 다시 잠근다. */
export function lock(): void {
  unlocked = false;
}
