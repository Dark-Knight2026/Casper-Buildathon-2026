/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_CSPR_CLOUD_API_KEY: string;
  readonly VITE_CASPER_NETWORK: string;
  readonly VITE_CASPER_RPC_URL: string;
  readonly VITE_CASPER_EXPLORER_URL: string;
  readonly VITE_ICO_CONTRACT_HASH: string;
  readonly VITE_ICO_PACKAGE_HASH: string;
  readonly VITE_BIG_TOKEN_CONTRACT_HASH: string;
  readonly VITE_TREASURY_CONTRACT_HASH: string;
  readonly VITE_USDC_CONTRACT_HASH: string;
  readonly VITE_USDT_CONTRACT_HASH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface CsprClickGlobal {
  signIn(): void;
  signOut(): void;
}

declare global {
  interface Window {
    csprclick?: CsprClickGlobal;
  }
}
