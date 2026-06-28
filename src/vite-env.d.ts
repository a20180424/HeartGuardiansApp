/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API (Cloudflare Workers). Absolute URL, no trailing slash.
   *  Used for BOTH web (Cloudflare Pages) and APK builds — never use relative paths,
   *  because the APK WebView origin (https://localhost / capacitor://localhost) is
   *  always cross-origin to the API. */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
