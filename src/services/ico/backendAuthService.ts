import { backendClient } from '@/lib/api-client';

interface NonceResponse {
  nonce: string;
  message: string;
}

interface LoginResponse {
  token: string;
  user: { id: string; role: string };
}

export async function getNonce(publicKey: string): Promise<NonceResponse> {
  // The API parameter is named wallet_address, but the value is a Casper public key
  // (hex string with a 1-byte algorithm prefix: 01 = Ed25519, 02 = Secp256k1).
  return backendClient.get<NonceResponse>(
    `/api/v1/auth/nonce?wallet_address=${encodeURIComponent(publicKey)}`,
    { retry: false },
  );
}

export async function loginWithSignature(
  publicKey: string,
  signatureHex: string,
): Promise<LoginResponse> {
  // casper_types::Signature::from_hex expects a 1-byte algorithm prefix:
  //   01 = Ed25519, 02 = Secp256k1
  // Per the Casper account-key format spec, account addresses are derived from
  // the public key with the same prefix byte prepended — so the address prefix
  // reliably identifies the signing algorithm. Reference:
  // https://docs.casper.network/concepts/accounts-and-keys/#account-keys
  const prefix = publicKey.startsWith('02') ? '02' : '01';
  const signature = signatureHex.startsWith(prefix) ? signatureHex : `${prefix}${signatureHex}`;

  // The API field is named wallet_address, but the value is the public key (see getNonce above).
  return backendClient.post<LoginResponse>(
    '/api/v1/auth/login',
    { wallet_address: publicKey, signature },
    { retry: false },
  );
}

export function applyToken(token: string | null): void {
  backendClient.setAuthToken(token);
}
