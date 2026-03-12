import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey, PurseIdentifier } from 'casper-js-sdk';
import { getCasperRpcClient } from '@/services/ico/casperClient';
import { TOKEN_HASHES } from '@/services/ico/cep18Service';

const MOTES_PER_CSPR = 1_000_000_000n;
const BALANCE_POLL_MS = 60_000; // 60 seconds

function isValidPublicKey(key: string): boolean {
  // Ed25519: 01 + 64 hex = 66 chars; Secp256k1: 02 + 66 hex = 68 chars
  if (!key.startsWith('01') && !key.startsWith('02')) return false;
  if (key.startsWith('01') && key.length !== 66) return false;
  if (key.startsWith('02') && key.length !== 68) return false;
  return /^[0-9a-fA-F]+$/.test(key);
}

function deriveAccountHashHex(publicKeyHex: string): string {
  const pk = PublicKey.fromHex(publicKeyHex);
  return pk.accountHash().toPrefixedString().replace(/^account-hash-/, '');
}

export interface WalletBalances {
  cspr: number;
  usdt: number;
  usdc: number;
  big: number;
}

interface UseWalletBalancesReturn {
  balances: WalletBalances;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── CSPR balance (via RPC) ──────────────────────────────────────────

async function fetchCSPRBalance(publicKeyHex: string): Promise<number> {
  const client = getCasperRpcClient();
  const pk = PublicKey.fromHex(publicKeyHex);

  // Try query_balance (Casper 2.0) first, fall back to state_get_balance (1.x)
  try {
    const purseId = PurseIdentifier.fromPublicKey(pk);
    const result = await client.queryLatestBalance(purseId);
    const motes = BigInt(result.balance.toString());
    return Number(motes / MOTES_PER_CSPR) + Number(motes % MOTES_PER_CSPR) / Number(MOTES_PER_CSPR);
  } catch {
    // Casper 2.0 not available, try 1.x fallback
  }

  // Fallback: get account info → main purse URef → state_get_balance
  const accountHashHex = deriveAccountHashHex(publicKeyHex);
  const accountKey = `account-hash-${accountHashHex}`;
  const stateResult = await client.queryLatestGlobalState(accountKey, []);
  const mainPurse = stateResult.rawJSON?.stored_value?.Account?.main_purse;
  if (!mainPurse) {
    throw new Error('Could not find main purse for account');
  }

  const balanceResult = await client.getLatestBalance(mainPurse);
  const motes = BigInt(balanceResult.balanceValue.toString());
  return Number(motes / MOTES_PER_CSPR) + Number(motes % MOTES_PER_CSPR) / Number(MOTES_PER_CSPR);
}

// ── FT balances via CSPR.Cloud REST API ─────────────────────────────

function normalizeHash(hash: string): string {
  return hash.replace(/^hash-/, '').toLowerCase();
}

const KNOWN_HASHES = {
  usdt: normalizeHash(TOKEN_HASHES.USDT),
  usdc: normalizeHash(TOKEN_HASHES.USDC),
  big: normalizeHash(TOKEN_HASHES.BIG),
};

// Fallback decimals if API doesn't provide them
const TOKEN_DECIMALS: Record<string, number> = {
  [KNOWN_HASHES.usdt]: 6,
  [KNOWN_HASHES.usdc]: 6,
  [KNOWN_HASHES.big]: 18,
};

interface FTBalances {
  usdt: number;
  usdc: number;
  big: number;
}

async function fetchFTBalancesFromCloud(publicKeyHex: string): Promise<FTBalances> {
  const result: FTBalances = { usdt: 0, usdc: 0, big: 0 };

  const accountHashHex = deriveAccountHashHex(publicKeyHex);
  const ftUrl = import.meta.env.DEV
    ? `/api/cspr-cloud/accounts/${accountHashHex}/ft-token-ownership`
    : `/api/cspr-cloud?path=${encodeURIComponent(`accounts/${accountHashHex}/ft-token-ownership`)}`;
  const resp = await fetch(ftUrl);
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`CSPR.Cloud FT API ${resp.status}: ${body}`);
  }

  const json = await resp.json();

  const items: unknown[] = json.data ?? (Array.isArray(json) ? json : []);

  for (const item of items) {
    const entry = item as Record<string, unknown>;
    // CSPR.Cloud returns contract_package_hash (matches our .env hashes)
    const hash = normalizeHash(
      String(entry.contract_package_hash ?? entry.contract_hash ?? '')
    );
    const rawBalance = String(entry.balance ?? '0');

    // Determine decimals: from API metadata or our fallback map
    let decimals: number;
    const meta = entry.metadata as Record<string, unknown> | undefined;
    if (typeof entry.decimals === 'number') {
      decimals = entry.decimals;
    } else if (typeof meta?.decimals === 'number') {
      decimals = meta.decimals as number;
    } else {
      decimals = TOKEN_DECIMALS[hash] ?? 0;
    }

    const raw = BigInt(rawBalance);
    if (raw === 0n) continue;
    const divisor = 10n ** BigInt(decimals);
    const value = Number(raw / divisor) + Number(raw % divisor) / Number(divisor);

    if (hash === KNOWN_HASHES.usdt) {
      result.usdt = value;
    } else if (hash === KNOWN_HASHES.usdc) {
      result.usdc = value;
    } else if (hash === KNOWN_HASHES.big) {
      result.big = value;
    }
  }

  return result;
}

// ── Combined fetch ──────────────────────────────────────────────────

const EMPTY_BALANCES: WalletBalances = { cspr: 0, usdt: 0, usdc: 0, big: 0 };

interface FetchAllResult {
  balances: WalletBalances;
  error: string | null;
}

async function fetchAllBalances(publicKey: string): Promise<FetchAllResult> {
  if (!isValidPublicKey(publicKey)) {
    throw new Error('Invalid public key format');
  }

  const [csprResult, ftResult] = await Promise.allSettled([
    fetchCSPRBalance(publicKey),
    fetchFTBalancesFromCloud(publicKey),
  ]);

  const errors: string[] = [];

  const cspr = csprResult.status === 'fulfilled' ? csprResult.value : 0;
  if (csprResult.status === 'rejected') {
    errors.push('Failed to fetch CSPR balance');
  }

  const ft = ftResult.status === 'fulfilled'
    ? ftResult.value
    : { usdt: 0, usdc: 0, big: 0 };
  if (ftResult.status === 'rejected') {
    errors.push('Failed to fetch token balances');
  }

  return {
    balances: {
      cspr,
      usdt: ft.usdt,
      usdc: ft.usdc,
      big: ft.big,
    },
    error: errors.length > 0 ? errors.join('. ') : null,
  };
}

// ── Hook ────────────────────────────────────────────────────────────

export function useWalletBalances(publicKey: string | null | undefined): UseWalletBalancesReturn {
  const {
    data,
    isLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery<FetchAllResult, Error>({
    queryKey: ['wallet-balances', publicKey],
    queryFn: () => fetchAllBalances(publicKey!),
    enabled: !!publicKey,
    refetchInterval: BALANCE_POLL_MS,
    staleTime: 10_000,
  });

  const refetch = useCallback(() => {
    queryRefetch();
  }, [queryRefetch]);

  return {
    balances: data?.balances ?? EMPTY_BALANCES,
    isLoading,
    error: data?.error ?? queryError?.message ?? null,
    refetch,
  };
}
