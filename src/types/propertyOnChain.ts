/**
 * On-chain property-asset record (`PropertyRegistry` — Casper / Odra).
 *
 * Mirrors the contract's `PropertyRecord` (see
 * `docs/casper_contract_schemas/property_registry_schema.json`). This is the
 * **property-asset-level** surface that anchors fractional tokenization — keep
 * it separate from `Listing.onChain` (`ListingOnChain`), which is the unrelated
 * listing-level hash commitment.
 *
 * U256 values are kept as decimal strings (a property id, a user id and a token
 * supply can all exceed `Number.MAX_SAFE_INTEGER`).
 */

/**
 * Lifecycle status from the contract's `PropertyStatus` enum. The **array order
 * is the contract discriminant** (`Draft = 0 … Closed = 5`) — encoders (the
 * deploy-arg builder) and decoders (the read service) both index into it, so do
 * not reorder.
 */
export const PROPERTY_ONCHAIN_STATUSES = [
  'draft',
  'active',
  'paused',
  'sold',
  'liquidating',
  'closed',
] as const;

export type PropertyOnChainStatus = (typeof PROPERTY_ONCHAIN_STATUSES)[number];

/**
 * A `PropertyRegistry::PropertyRecord`, keyed by its auto-incremented
 * `propertyId`. All numeric fields are U256 decimal strings.
 */
export interface PropertyOnChainRecord {
  /** Auto-incremented on-chain property id (U256, decimal string). */
  propertyId: string;
  /** Landlord's UserRegistry user id (the `issuer`, NOT a wallet) (U256). */
  issuerUserId: string;
  /** Fraction-token address (`hash-<hex>` Key), or null while none is set. */
  tokenAddress: string | null;
  /** Intended ownership-token supply, feeds fractionalization (U256). */
  totalSupply: string;
  /** IPFS URI / content hash of the canonical property payload. */
  metadataUri: string;
  /** Current lifecycle status. */
  status: PropertyOnChainStatus;
}
