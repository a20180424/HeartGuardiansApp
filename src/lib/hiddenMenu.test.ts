import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { configuredPin, isMenuAvailable, isUnlocked, unlock, lock } from "./hiddenMenu";

describe("hiddenMenu 잠금 store", () => {
  beforeEach(() => lock());
  afterEach(() => vi.unstubAllEnvs());

  it("PIN이 비어 있으면 configuredPin은 null", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "");
    expect(configuredPin()).toBeNull();
  });

  it("4자리 숫자가 아니면 null", () => {
    for (const bad of ["123", "12345", "abcd", "12a4", " 1234"]) {
      vi.stubEnv("VITE_HG_MENU_PIN", bad);
      expect(configuredPin()).toBeNull();
    }
  });

  it("4자리 숫자면 그 값을 돌려준다", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "7402");
    expect(configuredPin()).toBe("7402");
  });

  it("초기 상태는 잠김", () => {
    expect(isUnlocked()).toBe(false);
  });

  it("맞는 PIN이면 해제된다", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "7402");
    expect(unlock("7402")).toBe(true);
    expect(isUnlocked()).toBe(true);
  });

  it("틀린 PIN이면 잠긴 채로 false", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "7402");
    expect(unlock("1234")).toBe(false);
    expect(isUnlocked()).toBe(false);
  });

  it("PIN 미설정이면 어떤 입력으로도 해제되지 않는다 (fail closed)", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "");
    expect(unlock("")).toBe(false);
    expect(unlock("0000")).toBe(false);
    expect(isUnlocked()).toBe(false);
  });

  it("lock()으로 다시 잠긴다", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "7402");
    unlock("7402");
    lock();
    expect(isUnlocked()).toBe(false);
  });

  describe("isMenuAvailable", () => {
    it("PIN 미설정이면 false (fail closed)", () => {
      vi.stubEnv("VITE_HG_MENU_PIN", "");
      vi.stubEnv("DEV", false);
      expect(isMenuAvailable()).toBe(false);
    });

    it("유효한 4자리 PIN이면 true", () => {
      vi.stubEnv("VITE_HG_MENU_PIN", "7402");
      vi.stubEnv("DEV", false);
      expect(isMenuAvailable()).toBe(true);
    });

    // 개발에서도 프로덕션과 같은 PIN 흐름을 타므로 DEV 우회가 없다.
    // DEV에서 PIN 없이 열리면, PIN 패드가 떠도 unlock()이 영영 성공할 수 없어
    // (unlock은 항상 fail closed) 통과 불가능한 화면에 갇힌다.
    it("DEV여도 PIN 미설정이면 false — 통과 불가능한 PIN 패드를 띄우지 않는다", () => {
      vi.stubEnv("VITE_HG_MENU_PIN", "");
      vi.stubEnv("DEV", true);
      expect(isMenuAvailable()).toBe(false);
    });

    it("DEV여도 PIN이 있으면 true (프로덕션과 동일 판정)", () => {
      vi.stubEnv("VITE_HG_MENU_PIN", "7402");
      vi.stubEnv("DEV", true);
      expect(isMenuAvailable()).toBe(true);
    });
  });
});
