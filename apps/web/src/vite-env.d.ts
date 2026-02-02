/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly NODE_ENV: "development" | "test" | "production";
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
