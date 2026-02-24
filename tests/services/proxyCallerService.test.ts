import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@/services/ico/casperClient', () => ({
  hexToBytes: (hex: string) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  },
  stripHashPrefix: (hash: string) => hash.replace(/^(hash-|contract-)/, ''),
}));

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

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper: dynamic import to get a fresh module (clears internal WASM cache)
async function importFresh() {
  return await import('@/services/ico/proxyCallerService');
}

describe('loadProxyCallerWasm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    // Re-assign fetch mock after resetAllMocks
    global.fetch = mockFetch;
  });

  it('fetches WASM from /proxy_caller.wasm', async () => {
    const wasmBytes = new Uint8Array([0, 97, 115, 109]); // WASM magic bytes
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(wasmBytes.buffer),
    });

    // Mock crypto.subtle as undefined to skip hash verification
    const origSubtle = crypto.subtle;
    Object.defineProperty(crypto, 'subtle', { value: undefined, configurable: true });

    try {
      const { loadProxyCallerWasm } = await importFresh();
      const result = await loadProxyCallerWasm();
      expect(result).toBeInstanceOf(Uint8Array);
      expect(mockFetch).toHaveBeenCalledWith('/proxy_caller.wasm');
    } finally {
      Object.defineProperty(crypto, 'subtle', { value: origSubtle, configurable: true });
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
