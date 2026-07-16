// 외부 URL을 여는 단일 진입점.
// APK(Capacitor WebView)에서는 <a target="_blank">가 무시되므로 플러그인을 거쳐야 한다.
// @capacitor/inappbrowser의 openInWebView는 앱 안에서 전체화면 WebView를 띄우고,
// 툴바의 닫기 버튼(또는 기기 back)으로 닫으면 곧바로 앱으로 돌아온다.
// (앱 밖 기본 브라우저로 나가던 이전 방식 — @capacitor/app-launcher — 을 대체.)
// 돌아온 뒤 immersive 복구는 MainActivity.onWindowFocusChanged가 알아서 처리한다.
// 웹/DEV에서는 새 탭으로 연다.

import { Capacitor } from "@capacitor/core";
import {
  InAppBrowser,
  DefaultWebViewOptions,
  DefaultAndroidWebViewOptions,
} from "@capacitor/inappbrowser";

export function openExternal(url: string): void {
  if (Capacitor.isNativePlatform()) {
    InAppBrowser.openInWebView({
      url,
      options: {
        ...DefaultWebViewOptions,
        showURL: false, // 주소창은 초등 사용자에게 불필요한 노이즈
        closeButtonText: "닫기",
        // 기본값이 true라 열 때마다 쿠키가 지워져 로그인이 필요한 게시판이면
        // 매번 다시 로그인해야 한다. 세션을 유지하도록 끈다.
        clearCache: false,
        clearSessionCache: false,
        android: {
          ...DefaultAndroidWebViewOptions,
          allowZoom: true, // 태블릿에서 게시판 글 확대해 읽기
        },
      },
    }).catch((e) => console.error("[openExternal] openInWebView 실패", e));
  } else {
    // 웹: 새 탭. noopener/noreferrer로 원본 창 참조 차단.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
