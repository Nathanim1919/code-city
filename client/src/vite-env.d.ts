/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Full URL for OAuth return (overrides other client URL env). */
  readonly VITE_AUTH_CALLBACK_URL?: string;
  /** Frontend origin only (e.g. `https://codecity.nathanim.dev`). */
  readonly VITE_CLIENT_BASE_URL?: string;
  readonly VITE_CLIENT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
