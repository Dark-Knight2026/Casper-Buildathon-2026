import { useCallback } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';

import { useBlockchainTransaction } from '@/hooks/ico/useBlockchainTransaction';
import {
  createCreatePropertyTransaction,
  createSetPropertyStatusTransaction,
  createSetPropertyTokenTransaction,
  isPropertyRegistryEnabled,
  parsePropertyRegistryError,
  type CreatePropertyParamsInput,
  type U256Input,
} from '@/lib/casper/propertyRegistry';

/**
 * Landlord-signed on-chain property registration (`PropertyRegistry`).
 *
 * Models the `create_property → set_property_token → set_property_status(Active)`
 * lifecycle as **up to three independent signs**. Each step is its own
 * `useBlockchainTransaction` instance, so a later step can be retried (or run
 * once its inputs exist) without redoing an earlier one — there is no shared
 * "all or nothing" state.
 *
 * The landlord is both the deploy signer and the `issuer` (their UserRegistry
 * user id, `issuerUserId`). The caller resolves it from the auth profile and
 * gates on `canRegister` — when the indexer hasn't written the on-chain user id
 * yet, the create action is unavailable and the UI shows a "registering
 * identity…" state instead.
 *
 * Steps 2/3 need the contract-assigned `propertyId`, which is read back from the
 * indexer (PL-34) — pass it in once known. Step 3 also requires that step 2 has
 * set a token (the contract rejects `Active` otherwise; that revert surfaces via
 * `parsePropertyRegistryError`).
 */
export interface CreatePropertyInput {
  /** Intended ownership-token supply (feeds fractionalization). */
  totalSupply: U256Input;
  /** IPFS URI / content hash of the canonical property payload. */
  metadataUri: string;
}

export function usePropertyRegistration(
  publicKey: string | null | undefined,
  clickRef: ICSPRClickSDK | null,
  issuerUserId: string | null | undefined
) {
  const signer = publicKey ?? null;

  // Step 1 — create_property → Draft. `issuer` is injected from the profile.
  const {
    state: createState,
    execute: execCreate,
    reset: resetCreate,
  } = useBlockchainTransaction(
    signer,
    clickRef,
    (pk, params: CreatePropertyParamsInput) =>
      createCreatePropertyTransaction(pk, params),
    parsePropertyRegistryError
  );

  // Step 2 — set_property_token (only while Draft).
  const {
    state: tokenState,
    execute: execSetToken,
    reset: resetSetToken,
  } = useBlockchainTransaction(
    signer,
    clickRef,
    (pk, propertyId: U256Input, tokenHash: string) =>
      createSetPropertyTokenTransaction(pk, propertyId, tokenHash),
    parsePropertyRegistryError
  );

  // Step 3 — set_property_status(Active) (requires a token set).
  const {
    state: activateState,
    execute: execActivate,
    reset: resetActivate,
  } = useBlockchainTransaction(
    signer,
    clickRef,
    (pk, propertyId: U256Input) =>
      createSetPropertyStatusTransaction(pk, propertyId, 'active'),
    parsePropertyRegistryError
  );

  /** True once the contract is configured and the landlord's issuer id is known. */
  const canRegister = Boolean(isPropertyRegistryEnabled && issuerUserId);

  const createProperty = useCallback(
    async (input: CreatePropertyInput) => {
      // Gated by `canRegister` in the UI; bail defensively if issuer is unresolved.
      if (!issuerUserId) return;
      await execCreate({
        issuerUserId,
        totalSupply: input.totalSupply,
        metadataUri: input.metadataUri,
      });
    },
    [execCreate, issuerUserId]
  );

  const setPropertyToken = useCallback(
    (propertyId: U256Input, tokenHash: string) =>
      execSetToken(propertyId, tokenHash),
    [execSetToken]
  );

  const activateProperty = useCallback(
    (propertyId: U256Input) => execActivate(propertyId),
    [execActivate]
  );

  return {
    /** Whether the package hash is configured (feature is dark when false). */
    isEnabled: isPropertyRegistryEnabled,
    /** Whether the create step can run (configured + issuer resolved). */
    canRegister,
    /** Step 1: create the Draft record. */
    create: { state: createState, run: createProperty, reset: resetCreate },
    /** Step 2: attach the fraction token (needs `propertyId`). */
    setToken: {
      state: tokenState,
      run: setPropertyToken,
      reset: resetSetToken,
    },
    /** Step 3: activate (needs `propertyId`; step 2 must have run). */
    activate: {
      state: activateState,
      run: activateProperty,
      reset: resetActivate,
    },
  };
}
