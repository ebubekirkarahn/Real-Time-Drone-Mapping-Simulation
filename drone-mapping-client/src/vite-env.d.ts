/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL: string;
  readonly VITE_TITILER_URL: string;
  readonly VITE_SCANNING_DURATION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
