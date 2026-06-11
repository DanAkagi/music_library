/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MUSIC_PATH: string;
  readonly VITE_URL_SERVER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
