/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ROUTE: string;
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
