import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
const mockQueryOdraState = vi.fn();
const mockClValueListU8ToHex = vi.fn();

vi.mock('@/services/ico/casperClient', () => ({
  queryOdraState: (...args: unknown[]) => mockQueryOdraState(...args),
  clValueListU8ToHex: (...args: unknown[]) => mockClValueListU8ToHex(...args),
  hexToBytes: (hex: string) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  },
  readU64LE: (bytes: Uint8Array, offset: number): [bigint, number] => {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    return [view.getBigUint64(0, true), offset + 8];
  },
  readU128VarLen: (bytes: Uint8Array, offset: number): [bigint, number] => {
    const length = bytes[offset];
    if (length === 0) return [0n, offset + 1];
    let value = 0n;
    for (let i = 0; i < length; i++) {
      value |= BigInt(bytes[offset + 1 + i]) << BigInt(i * 8);
    }
    return [value, offset + 1 + length];
  },
  readU256VarLen: (bytes: Uint8Array, offset: number): [bigint, number] => {
    const length = bytes[offset];
    if (length === 0) return [0n, offset + 1];
    let value = 0n;
    for (let i = 0; i < length; i++) {
      value |= BigInt(bytes[offset + 1 + i]) << BigInt(i * 8);
    }
    return [value, offset + 1 + length];
  },
}));

vi.mock('@/services/ico/odraStorage', () => ({
  ICO_DICTIONARY_KEYS: {
    owner: 'mock-owner-key',
    pendingOwner: 'mock-pending-owner-key',
    icoSchedulesCount: 'mock-count-key',
    styksPriceFeed: 'mock-price-feed-key',
    tailorCoin: 'mock-tailor-coin-key',
    treasury: 'mock-treasury-key',
  },
  getScheduleKey: vi.fn((id: number | bigint) => `mock-schedule-key-${id}`),
  getCurrencyKey: vi.fn((currency: string) => `mock-currency-key-${currency}`),
  debugLogKeys: vi.fn(),
}));

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CONTRACTS: {
      icoAddress: 'hash-ico-contract',
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Helper: dynamic import to get a fresh module with cleared caches
async function importFresh() {
  return await import('@/services/ico/icoContractService');
}

// Helper: build hex for a U128 count value with 4-byte length prefix
function buildCountHex(count: number): string {
  // 4-byte length prefix (LE) + variable-length U128
  const countBytes = count === 0 ? [0] : [1, count];
  const lengthPrefix = [countBytes.length, 0, 0, 0]; // 4-byte LE length
  return [...lengthPrefix, ...countBytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: build hex for an ICOSchedule struct
// Format: 4-byte length prefix + u64 start + u64 end + U256 saleAmount + U256 soldAmount + U256 price
function buildScheduleHex(opts: {
  startTimestamp: bigint;
  endTimestamp: bigint;
  saleAmount: bigint;
  soldAmount: bigint;
  price: bigint;
}): string {
  const parts: number[] = [];

  // u64 LE helper
  const pushU64 = (val: bigint) => {
    for (let i = 0; i < 8; i++) {
      parts.push(Number((val >> BigInt(i * 8)) & 0xffn));
    }
  };

  // U256 var-length helper
  const pushU256 = (val: bigint) => {
    if (val === 0n) {
      parts.push(0);
      return;
    }
    const temp: number[] = [];
    let v = val;
    while (v > 0n) {
      temp.push(Number(v & 0xffn));
      v >>= 8n;
    }
    parts.push(temp.length);
    parts.push(...temp);
  };

  pushU64(opts.startTimestamp);
  pushU64(opts.endTimestamp);
  pushU256(opts.saleAmount);
  pushU256(opts.soldAmount);
  pushU256(opts.price);

  // Add 4-byte length prefix
  const lengthPrefix = [parts.length, 0, 0, 0];
  return [...lengthPrefix, ...parts].map(b => b.toString(16).padStart(2, '0')).join('');
}

describe('getSchedulesCount', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('returns count from contract state', async () => {
    const hex = buildCountHex(3);
    mockQueryOdraState.mockResolvedValue({ clValue: {} });
    mockClValueListU8ToHex.mockReturnValue(hex);

    const { getSchedulesCount } = await importFresh();
    const count = await getSchedulesCount();
    expect(count).toBe(3);
  });

  it('returns 0 when no data found', async () => {
    mockQueryOdraState.mockResolvedValue(null);

    const { getSchedulesCount } = await importFresh();
    const count = await getSchedulesCount();
    expect(count).toBe(0);
  });

  it('returns 0 when hex is null', async () => {
    mockQueryOdraState.mockResolvedValue({ clValue: {} });
    mockClValueListU8ToHex.mockReturnValue(null);

    const { getSchedulesCount } = await importFresh();
    const count = await getSchedulesCount();
    expect(count).toBe(0);
  });
});

describe('getAllSchedules', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('returns parsed schedules', async () => {
    const now = BigInt(Date.now());
    const scheduleHex = buildScheduleHex({
      startTimestamp: now - 10000n,
      endTimestamp: now + 100000n,
      saleAmount: 1000000n,
      soldAmount: 500000n,
      price: 1500n,
    });

    // First call: count query
    mockQueryOdraState.mockResolvedValueOnce({ clValue: {} });
    mockClValueListU8ToHex.mockReturnValueOnce(buildCountHex(1));

    // Second call: schedule query
    mockQueryOdraState.mockResolvedValueOnce({ clValue: {} });
    mockClValueListU8ToHex.mockReturnValueOnce(scheduleHex);

    const { getAllSchedules } = await importFresh();
    const schedules = await getAllSchedules();
    expect(schedules).toHaveLength(1);
    expect(schedules[0].id).toBe(0n);
    expect(schedules[0].schedule.saleAmount).toBe(1000000n);
    expect(schedules[0].schedule.soldAmount).toBe(500000n);
    expect(schedules[0].schedule.price).toBe(1500n);
  });

  it('returns empty array when count is 0', async () => {
    mockQueryOdraState.mockResolvedValue({ clValue: {} });
    mockClValueListU8ToHex.mockReturnValue(buildCountHex(0));

    const { getAllSchedules } = await importFresh();
    const schedules = await getAllSchedules();
    expect(schedules).toHaveLength(0);
  });
});

describe('getCurrentSchedule', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('returns null when no active schedule', async () => {
    const pastEnd = BigInt(Date.now()) - 100000n;
    const scheduleHex = buildScheduleHex({
      startTimestamp: pastEnd - 200000n,
      endTimestamp: pastEnd,
      saleAmount: 1000n,
      soldAmount: 0n,
      price: 100n,
    });

    mockQueryOdraState.mockResolvedValueOnce({ clValue: {} });
    mockClValueListU8ToHex.mockReturnValueOnce(buildCountHex(1));
    mockQueryOdraState.mockResolvedValueOnce({ clValue: {} });
    mockClValueListU8ToHex.mockReturnValueOnce(scheduleHex);

    const { getCurrentSchedule } = await importFresh();
    const current = await getCurrentSchedule();
    expect(current).toBeNull();
  });
});

describe('getTokenPriceUsd', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('returns 0n when no schedules exist', async () => {
    mockQueryOdraState.mockResolvedValue({ clValue: {} });
    mockClValueListU8ToHex.mockReturnValue(buildCountHex(0));

    const { getTokenPriceUsd } = await importFresh();
    const price = await getTokenPriceUsd();
    expect(price).toBe(0n);
  });
});

describe('contract address readers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('getTailorCoinAddress returns key value', async () => {
    mockQueryOdraState.mockResolvedValue({
      clValue: { key: { toString: () => 'hash-tailor-abc' } },
    });

    const { getTailorCoinAddress } = await importFresh();
    const address = await getTailorCoinAddress();
    expect(address).toBe('hash-tailor-abc');
  });

  it('getTailorCoinAddress returns null when not found', async () => {
    mockQueryOdraState.mockResolvedValue(null);

    const { getTailorCoinAddress } = await importFresh();
    const address = await getTailorCoinAddress();
    expect(address).toBeNull();
  });

  it('getTreasuryAddress returns key value', async () => {
    mockQueryOdraState.mockResolvedValue({
      clValue: { key: { toString: () => 'hash-treasury-abc' } },
    });

    const { getTreasuryAddress } = await importFresh();
    const address = await getTreasuryAddress();
    expect(address).toBe('hash-treasury-abc');
  });

  it('getOwnerAddress returns key value', async () => {
    mockQueryOdraState.mockResolvedValue({
      clValue: { key: { toString: () => 'account-hash-owner-abc' } },
    });

    const { getOwnerAddress } = await importFresh();
    const address = await getOwnerAddress();
    expect(address).toBe('account-hash-owner-abc');
  });

  it('getOwnerAddress returns null on RPC error', async () => {
    mockQueryOdraState.mockRejectedValue(new Error('RPC timeout'));

    const { getOwnerAddress } = await importFresh();
    const address = await getOwnerAddress();
    expect(address).toBeNull();
  });
});
