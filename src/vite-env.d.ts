/// <reference types="vite/client" />

interface CsprClickGlobal {
  signIn(): void;
  signOut(): void;
}

declare global {
  interface Window {
    csprclick?: CsprClickGlobal;
  }
}
