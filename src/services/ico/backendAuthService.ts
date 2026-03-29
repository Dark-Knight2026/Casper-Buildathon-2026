import { backendClient } from '@/lib/api-client';

interface NonceResponse {
  nonce: string;
  message: string;
}

interface LoginResponse {
  token: string;
  user: { id: string; role: string };
}

export async function getNonce(walletAddress: string): Promise<NonceResponse> {
  return backendClient.get<NonceResponse>(
    `/api/v1/auth/nonce?wallet_address=${encodeURIComponent(walletAddress)}`,
    { retry: false },
  );
}

export async function loginWithSignature(
  walletAddress: string,
  signatureHex: string,
): Promise<LoginResponse> {
  // casper_types::Signature::from_hex expects a 1-byte algorithm prefix:
  //   01 = Ed25519, 02 = Secp256k1
  // Per the Casper account-key format spec, account addresses are derived from
  // the public key with the same prefix byte prepended — so the address prefix
  // reliably identifies the signing algorithm. Reference:
  // https://docs.casper.network/concepts/accounts-and-keys/#account-keys
  const prefix = walletAddress.startsWith('02') ? '02' : '01';
  const signature = signatureHex.startsWith(prefix) ? signatureHex : `${prefix}${signatureHex}`;

  return backendClient.post<LoginResponse>(
    '/api/v1/auth/login',
    { wallet_address: walletAddress, signature },
    { retry: false },
  );
}

export function applyToken(token: string | null): void {
  backendClient.setAuthToken(token);
}
