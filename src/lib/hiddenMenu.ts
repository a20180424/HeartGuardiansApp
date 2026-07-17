// 히든 점프 메뉴(교사 시연용)의 잠금 상태. 학생에게 노출되면 안 된다.
//
// - PIN은 빌드 타임에 VITE_HG_MENU_PIN으로 주입한다(.env.local, gitignored).
//   VITE_ 접두어라 번들에 인라인된다 — APK를 뜯으면 보인다. 위협 모델은 교실의
//   초등학생이지 리버서가 아니므로 수용한다.
// - fail closed: PIN이 없거나 4자리가 아니면 개발·프로덕션 모두 메뉴가 열리지 않는다.
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

/**
 * 이 빌드에서 메뉴를 열 수 있는지. DEV 우회가 없다 — 개발에서도 프로덕션과
 * 똑같이 PIN을 요구하므로, 교사가 볼 화면을 개발 중에 그대로 확인할 수 있다.
 *
 * DEV라고 PIN 없이 열어주면 안 된다: unlock()은 PIN 미설정 시 항상 false라
 * (fail closed) 통과할 수 없는 PIN 패드에 갇힌다. 게이팅 규칙을 한 곳으로
 * 모아 두 함수가 어긋나지 않게 한다.
 *
 * ※ 점프 파라미터 게이트(devJump)는 별개로 DEV 우회를 유지한다 — 개발 중
 *   주소창으로 #/planet/1?m=3 을 바로 여는 동선을 막지 않기 위해서다.
 */
export function isMenuAvailable(): boolean {
  return configuredPin() !== null;
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
