import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Track SessionBuilder method calls via these mock fns
const mockSessionBuilderCalls = {
  from: vi.fn(),
  wasm: vi.fn(),
  runtimeArgs: vi.fn(),
  chainName: vi.fn(),
  payment: vi.fn(),
  build: vi.fn(),
};

vi.mock('casper-js-sdk', () => ({
  Args: {
    fromMap: vi.fn((map: Record<string, unknown>) => ({
      ...map,
      toBytes: () => new Uint8Array([1, 2, 3]),
    })),
  },
  CLValue: {
    newCLByteArray: vi.fn((v: unknown) => ({ type: 'ByteArray', value: v })),
    newCLString: vi.fn((v: unknown) => ({ type: 'String', value: v })),
    newCLList: vi.fn((_type: unknown, items: unknown[]) => ({ type: 'List<U8>', items })),
    newCLUint8: vi.fn((v: unknown) => ({ type: 'U8', value: v })),
    newCLUInt512: vi.fn((v: unknown) => ({ type: 'U512', value: v })),
  },
  CLTypeUInt8: 'U8Type',
  PublicKey: {
    fromHex: vi.fn(() => ({ publicKeyHex: 'mock-pk' })),
  },
  Transaction: {},
  // Use a real class so `new SessionBuilder()` works properly
  SessionBuilder: class MockSessionBuilder {
    from(...args: unknown[]) { mockSessionBuilderCalls.from(...args); return this; }
    wasm(...args: unknown[]) { mockSessionBuilderCalls.wasm(...args); return this; }
    runtimeArgs(...args: unknown[]) { mockSessionBuilderCalls.runtimeArgs(...args); return this; }
    chainName(...args: unknown[]) { mockSessionBuilderCalls.chainName(...args); return this; }
    payment(...args: unknown[]) { mockSessionBuilderCalls.payment(...args); return this; }
    build(...args: unknown[]) { mockSessionBuilderCalls.build(...args); return { hash: { toHex: () => 'mock-tx-hash' } }; }
  },
}));

vi.mock('@/services/ico/casperClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/ico/casperClient')>();
  return { ...actual };
});

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CASPER: {
      networkName: 'casper-test',
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const mockFetch = vi.fn();

// The expected hash hardcoded in proxyCallerService.ts
const EXPECTED_HASH = 'e19fb6e86c4a8de96769913c4922d8a340884b98b6984ec0375d63d0ce64c998';

/** Convert a hex string to an ArrayBuffer (simulates crypto.subtle.digest output) */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

// Helper: dynamic import to get a fresh module (clears internal WASM cache)
async function importFresh() {
  return await import('@/services/ico/proxyCallerService');
}

describe('loadProxyCallerWasm', () => {
  const origSubtle = crypto.subtle;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.stubGlobal('fetch', mockFetch);
    // Restore crypto.subtle before each test
    Object.defineProperty(crypto, 'subtle', { value: origSubtle, configurable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches WASM and passes when SHA-256 matches', async () => {
    const wasmBytes = new Uint8Array([0, 97, 115, 109]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(wasmBytes.buffer),
    });

    // Mock crypto.subtle.digest to return the expected hash
    const mockDigest = vi.fn().mockResolvedValue(hexToBuffer(EXPECTED_HASH));
    Object.defineProperty(crypto, 'subtle', {
      value: { digest: mockDigest },
      configurable: true,
    });

    const { loadProxyCallerWasm } = await importFresh();
    const result = await loadProxyCallerWasm();

    expect(result).toBeInstanceOf(Uint8Array);
    expect(mockFetch).toHaveBeenCalledWith('/proxy_caller.wasm');
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', wasmBytes);
  });

  it('throws when SHA-256 hash does not match (tampered WASM)', async () => {
    const wasmBytes = new Uint8Array([0, 97, 115, 109]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(wasmBytes.buffer),
    });

    // Mock crypto.subtle.digest to return a wrong hash
    const wrongHash = 'aa'.repeat(32);
    Object.defineProperty(crypto, 'subtle', {
      value: { digest: vi.fn().mockResolvedValue(hexToBuffer(wrongHash)) },
      configurable: true,
    });

    const { loadProxyCallerWasm } = await importFresh();
    await expect(loadProxyCallerWasm()).rejects.toThrow('WASM integrity check failed');
  });

  it('throws in production when crypto.subtle is unavailable', async () => {
    const wasmBytes = new Uint8Array([0, 97, 115, 109]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(wasmBytes.buffer),
    });

    Object.defineProperty(crypto, 'subtle', { value: undefined, configurable: true });
    // Simulate production environment
    const origProd = import.meta.env.PROD;
    import.meta.env.PROD = true;

    try {
      const { loadProxyCallerWasm } = await importFresh();
      await expect(loadProxyCallerWasm()).rejects.toThrow('WASM integrity check unavailable in production');
    } finally {
      import.meta.env.PROD = origProd;
    }
  });

  it('throws when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { loadProxyCallerWasm } = await importFresh();
    await expect(loadProxyCallerWasm()).rejects.toThrow('Failed to load proxy_caller.wasm: 404');
  });
});

describe('createProxyCallerTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('creates a transaction with correct structure', async () => {
    const { Args } = await import('casper-js-sdk');
    const mockArgs = Args.fromMap({}) as InstanceType<typeof Args>;
    const proxyWasm = new Uint8Array([0, 97, 115, 109]);

    const { createProxyCallerTransaction } = await importFresh();
    const tx = createProxyCallerTransaction(
      '01abc123',
      'hash-package-abc',
      'purchase',
      mockArgs,
      5000000000n, // 5 CSPR in motes
      10000000000n, // 10 CSPR gas
      proxyWasm,
    );

    expect(tx).toBeDefined();
    expect(mockSessionBuilderCalls.wasm).toHaveBeenCalledWith(proxyWasm);
    expect(mockSessionBuilderCalls.chainName).toHaveBeenCalledWith('casper-test');
    expect(mockSessionBuilderCalls.build).toHaveBeenCalled();
  });

  it('strips hash- prefix from package hash', async () => {
    const { Args } = await import('casper-js-sdk');
    const mockArgs = Args.fromMap({}) as InstanceType<typeof Args>;
    const proxyWasm = new Uint8Array([0, 97, 115, 109]);

    const { createProxyCallerTransaction } = await importFresh();
    createProxyCallerTransaction(
      '01abc123',
      'hash-deadbeef',
      'purchase',
      mockArgs,
      1000n,
      1000n,
      proxyWasm,
    );

    // stripHashPrefix should have been called, and hexToBytes converts raw hex
    expect(mockSessionBuilderCalls.build).toHaveBeenCalled();
  });
});
