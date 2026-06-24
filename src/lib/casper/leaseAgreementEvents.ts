/**
 * Reads the on-chain ids assigned by a `create_lease_agreement` deploy.
 *
 * The contract returns the lease id and mints the tenant's lease NFT inside the
 * same call, emitting two CES (Casper Event Standard) events we care about:
 *   • `LeaseAgreementCreated { lease_agreement_id: U256, created_at: u64 }`
 *   • `Mint { to: Key, token_id: U256 }` (from the lease-NFT contract)
 * `LeaseAgreementCreated` carries the lease id but NOT the NFT token id (the
 * contract keeps it on the agreement, exposed only via a view), so the token id
 * has to be read from the NFT `Mint` event. `create_lease_agreement` mints
 * exactly one NFT, so there is exactly one `Mint` per commit deploy.
 *
 * CSPR.cloud's REST tier doesn't expose CES events, so we read them from the
 * deploy's execution effects via the node RPC (`info_get_deploy`, already on the
 * `/api/casper-rpc` allowlist). Each event is written to the contract's events
 * dictionary as a `CLValue` whose bytes contain the length-prefixed event name
 * (`event_<Name>`) followed by the bytesrepr-encoded fields. We locate the
 * `event_` marker, then decode the fields we need (mirrors the encoders in
 * `leaseAgreement.ts`: `U256` = 1-byte length + little-endian bytes; `Key` =
 * 1-byte tag + 32-byte hash).
 *
 * Best-effort enrichment: on any failure it returns nulls and the caller still
 * commits with just the deploy hash (the backend indexer remains the fallback
 * for the lease id). It never throws.
 */

import { logger } from '@/utils/logger';

/** On-chain ids parsed from a `create_lease_agreement` deploy. */
export interface LeaseCommitIds {
  /** `LeaseAgreementCreated.lease_agreement_id` (U256 decimal string). */
  onchainLeaseId: string | null;
  /** The lease NFT's `Mint.token_id` (U256 decimal string). */
  nftTokenId: string | null;
}

const RPC_PROXY_URL = '/api/casper-rpc';
const RPC_TIMEOUT_MS = 20_000;

// ── Minimal bytesrepr reader (decode side of leaseAgreement.ts) ──────────────

class ByteReader {
  private offset: number;

  constructor(
    private readonly bytes: Uint8Array,
    startOffset = 0
  ) {
    this.offset = startOffset;
  }

  /** Read `n` raw bytes. */
  private take(n: number): Uint8Array {
    const slice = this.bytes.subarray(this.offset, this.offset + n);
    if (slice.length !== n)
      throw new RangeError('unexpected end of event bytes');
    this.offset += n;
    return slice;
  }

  /** `u8`. */
  u8(): number {
    return this.take(1)[0];
  }

  /** `u32` — 4 little-endian bytes. */
  u32(): number {
    const b = this.take(4);
    return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24);
  }

  /** `String::from_bytes` — `u32` length then UTF-8 bytes. */
  string(): string {
    const len = this.u32();
    return new TextDecoder().decode(this.take(len));
  }

  /** `U256::from_bytes` — 1-byte significant length then little-endian bytes. */
  u256(): string {
    const len = this.u8();
    const le = this.take(len);
    let value = 0n;
    for (let i = le.length - 1; i >= 0; i -= 1)
      value = (value << 8n) | BigInt(le[i]);
    return value.toString();
  }

  /** `Key::from_bytes` — a 1-byte tag then the 32-byte hash. */
  skipKey(): void {
    this.take(1);
    this.take(32);
  }
}

const EVENT_MARKER = new TextEncoder().encode('event_');

function indexOfMarker(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

// ── Effect walk ──────────────────────────────────────────────────────────────

interface WriteTransform {
  kind?: { Write?: { CLValue?: { bytes?: string } } };
}

/** Each `event_<Name>` CES payload written to a contract's events dictionary. */
function* iterEventBytes(effects: WriteTransform[]): Generator<{
  name: string;
  reader: ByteReader;
}> {
  for (const t of effects) {
    const hex = t?.kind?.Write?.CLValue?.bytes;
    if (typeof hex !== 'string' || hex.length === 0) continue;

    let raw: Uint8Array;
    try {
      raw = hexToBytes(hex);
    } catch {
      continue;
    }

    const markerAt = indexOfMarker(raw, EVENT_MARKER);
    // The 4 bytes before `event_` are the name's `u32` length prefix.
    if (markerAt < 4) continue;

    try {
      const reader = new ByteReader(raw, markerAt - 4);
      const name = reader.string();
      yield { name, reader };
    } catch {
      // Not a well-formed event payload — skip.
    }
  }
}

/**
 * Fetch the deploy and parse the lease id + NFT token id from its CES events.
 * Returns `{ onchainLeaseId: null, nftTokenId: null }` on any failure.
 */
export async function extractLeaseCommitIds(
  deployHash: string,
  signal?: AbortSignal
): Promise<LeaseCommitIds> {
  const empty: LeaseCommitIds = { onchainLeaseId: null, nftTokenId: null };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });

    let response: Response;
    try {
      response = await fetch(RPC_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'info_get_deploy',
          params: { deploy_hash: deployHash },
        }),
      });
    } finally {
      clearTimeout(timeoutId);
      // Don't leave a listener on a long-lived external signal once we're done.
      signal?.removeEventListener('abort', onAbort);
    }

    if (!response.ok) return empty;
    const json = await response.json();

    // Casper 2.0 shape: result.execution_info.execution_result.Version2.effects.
    const effects: WriteTransform[] | undefined =
      json?.result?.execution_info?.execution_result?.Version2?.effects;
    if (!Array.isArray(effects)) return empty;

    let onchainLeaseId: string | null = null;
    let nftTokenId: string | null = null;

    for (const { name, reader } of iterEventBytes(effects)) {
      try {
        if (name === 'event_LeaseAgreementCreated' && onchainLeaseId === null) {
          onchainLeaseId = reader.u256(); // lease_agreement_id; created_at unused
        } else if (name === 'event_Mint' && nftTokenId === null) {
          reader.skipKey(); // `to`
          nftTokenId = reader.u256(); // token_id
        }
      } catch {
        // Field layout didn't match — leave that id null.
      }
    }

    return { onchainLeaseId, nftTokenId };
  } catch (err) {
    logger.warn('Failed to read lease commit ids from deploy:', err);
    return empty;
  }
}
