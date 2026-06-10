/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_FRONTEND_URL?: string;
  readonly NEXT_PUBLIC_API_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_FRONTEND_URL?: string;
  readonly VITE_MOCK?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_MP_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
