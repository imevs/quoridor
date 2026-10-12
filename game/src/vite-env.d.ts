/// <reference types="vite/client" />

declare const __ONLINE__: boolean;

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
  /** Endpoint returning RTCIceServer[] (e.g. Metered credentials API). See game/.env.example. */
  readonly VITE_TURN_CREDENTIALS_URL?: string;
  /** Comma-separated static TURN URLs. */
  readonly VITE_TURN_URLS?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
