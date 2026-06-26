import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { extractLeaseCommitIds } from './leaseAgreementEvents';

// Real CES-event CLValue bytes from the testnet `create_lease_agreement` deploy
// d89816e4…ba329 (lease package 2b76bee4…fea38). Each is the dictionary write's
// `CLValue.bytes`: the length-prefixed `event_<Name>` then bytesrepr fields
// (plus the dictionary-wrapping trailing bytes the parser ignores).
const MINT_EVENT_BYTES =
  '35000000310000000a0000006576656e745f4d696e74008476fb07aba3540342e16ffa1bb667d24ecf17c67b04d001618524d6c975ab7e01010e0320000000a61c23ebb1c55f737a7e7508d86261782bd7750bc235b2e1ecf37131915f36ae020000003134';
const LEASE_CREATED_EVENT_BYTES =
  '2d000000290000001b0000006576656e745f4c6561736541677265656d656e7443726561746564010170de35f09e0100000e0320000000f2bd07d129606c326e7088ea93d1360467b076dbcc54c06bf55e96b94e356bab0100000032';

const writeTransform = (bytes: string) => ({
  kind: { Write: { CLValue: { cl_type: 'Any', bytes } } },
});

const deployResponse = (effects: unknown[]) => ({
  ok: true,
  json: () =>
    Promise.resolve({
      result: {
        execution_info: { execution_result: { Version2: { effects } } },
      },
    }),
});

const mockFetch = vi.fn();

describe('extractLeaseCommitIds', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the lease id and NFT token id from the deploy CES events', async () => {
    mockFetch.mockResolvedValueOnce(
      deployResponse([
        writeTransform('010203'), // unrelated write — skipped
        writeTransform(MINT_EVENT_BYTES),
        writeTransform(LEASE_CREATED_EVENT_BYTES),
      ])
    );

    const ids = await extractLeaseCommitIds('d89816e4');

    expect(ids).toEqual({
      onchainLeaseId: '1',
      nftTokenId: '1',
      invoiceIds: [],
    });
    // Calls the node RPC proxy with info_get_deploy.
    const body = JSON.parse(
      (mockFetch.mock.calls[0][1] as RequestInit).body as string
    );
    expect(body.method).toBe('info_get_deploy');
    expect(body.params.deploy_hash).toBe('d89816e4');
  });

  it('returns the lease id alone when the deploy has no Mint event', async () => {
    mockFetch.mockResolvedValueOnce(
      deployResponse([writeTransform(LEASE_CREATED_EVENT_BYTES)])
    );

    await expect(extractLeaseCommitIds('h')).resolves.toEqual({
      onchainLeaseId: '1',
      nftTokenId: null,
      invoiceIds: [],
    });
  });

  it('returns nulls when the RPC call fails (best-effort, never throws)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(extractLeaseCommitIds('h')).resolves.toEqual({
      onchainLeaseId: null,
      nftTokenId: null,
      invoiceIds: [],
    });
  });

  it('returns nulls when the result has no Version2 effects', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    });

    await expect(extractLeaseCommitIds('h')).resolves.toEqual({
      onchainLeaseId: null,
      nftTokenId: null,
      invoiceIds: [],
    });
  });

  it('returns nulls when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));

    await expect(extractLeaseCommitIds('h')).resolves.toEqual({
      onchainLeaseId: null,
      nftTokenId: null,
      invoiceIds: [],
    });
  });
});
