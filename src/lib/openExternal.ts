// 외부 URL을 여는 단일 진입점.
// APK(Capacitor WebView)에서는 <a target="_blank">가 무시되고, @capacitor/browser는 앱 위에
// 겹치는 인앱 브라우저(Custom Tabs)를 띄운다. 진짜로 기기 기본 브라우저 "앱"으로 나가서 열려면
// @capacitor/app-launcher(AppLauncher.openUrl)로 안드로이드 인텐트를 태운다.
// 웹/DEV에서는 새 탭으로 연다.

import { Capacitor } from "@capacitor/core";
import { AppLauncher } from "@capacitor/app-launcher";

export function openExternal(url: string): void {
  if (Capacitor.isNativePlatform()) {
    // 네이티브: 외부 기본 브라우저 앱으로 연다(앱 밖으로 나감). 실패해도 앱을 막지 않도록 로그만.
    AppLauncher.openUrl({ url }).catch((e) => console.error("[openExternal] openUrl 실패", e));
  } else {
    // 웹: 새 탭. noopener/noreferrer로 원본 창 참조 차단.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
