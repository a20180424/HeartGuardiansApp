/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API (Cloudflare Workers). Absolute URL, no trailing slash.
   *  Used for BOTH web (Cloudflare Pages) and APK builds — never use relative paths,
   *  because the APK WebView origin (https://localhost / capacitor://localhost) is
   *  always cross-origin to the API. */
  readonly VITE_API_URL: string;

  /** 히든 점프 메뉴(교사 시연용) PIN. 4자리 숫자.
   *  .env.local 에만 두고 커밋하지 않는다. 미설정이면 프로덕션에서 메뉴가
   *  열리지 않는다(fail closed). 값은 번들에 인라인되므로 비밀이 아니다 —
   *  교실의 학생을 막는 용도다. */
  readonly VITE_HG_MENU_PIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
