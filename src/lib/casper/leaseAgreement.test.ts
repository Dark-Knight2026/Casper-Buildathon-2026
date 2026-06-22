import { describe, expect, it } from 'vitest';

import {
  encodeCreateLeaseAgreementParams,
  encodeCurrencyAmount,
  parseLeaseAgreementError,
  u256ToBytes,
  u32ToBytes,
  u64ToBytes,
} from './leaseAgreement';

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

describe('primitive ToBytes encoders', () => {
  it('u256ToBytes is length-prefixed little-endian; zero is a single 0x00', () => {
    expect(hex(u256ToBytes(0))).toBe('00');
    expect(hex(u256ToBytes(1))).toBe('0101');
    expect(hex(u256ToBytes(255))).toBe('01ff');
    expect(hex(u256ToBytes(256))).toBe('020001');
  });

  it('u32ToBytes is 4 fixed little-endian bytes', () => {
    expect(hex(u32ToBytes(0))).toBe('00000000');
    expect(hex(u32ToBytes(10000))).toBe('10270000');
  });

  it('u64ToBytes is 8 fixed little-endian bytes', () => {
    expect(hex(u64ToBytes(0))).toBe('0000000000000000');
    expect(hex(u64ToBytes(1))).toBe('0100000000000000');
    // 30-day month in seconds = 2_592_000 = 0x278d00
    expect(hex(u64ToBytes(2_592_000))).toBe('008d27' + '0000000000');
  });
});

describe('encodeCurrencyAmount', () => {
  it('native (no currency) is Option::None then the amount', () => {
    // None (0x00) ++ U256(250) -> length 1, byte 0xfa
    expect(hex(encodeCurrencyAmount({ amount: 250 }))).toBe('00' + '01fa');
  });

  it('Some(currency) prefixes the option tag and a 33-byte Key', () => {
    const bytes = encodeCurrencyAmount({
      currency:
        'hash-7f06f66426f18ca8d3b8df69f977a54554d39fda43ebe942fd22ece0d20235bd',
      amount: 1,
    });
    // Option::Some tag, then Key (1-byte type tag + 32-byte hash), then U256(1).
    expect(bytes[0]).toBe(1); // Option::Some
    expect(bytes.length).toBe(1 + 33 + 2); // tag + key + U256(1)=[01,01]
    expect(hex(bytes.slice(-2))).toBe('0101');
  });
});

describe('parseLeaseAgreementError', () => {
  it('maps lease user errors to friendly copy', () => {
    expect(parseLeaseAgreementError('User error: 415')).toMatch(/tenant/i);
    expect(parseLeaseAgreementError('User error: 404')).toMatch(/rent/i);
  });

  it('maps the Odra deserialization framework error (64647) to an ABI-mismatch hint', () => {
    // 64647 = 64536 (UserErrorTooHigh) + 111 (EarlyEndOfStream)
    expect(parseLeaseAgreementError('User error: 64647')).toMatch(
      /couldn’t read the lease parameters|format.*match|version/i
    );
  });

  it('flags out-of-gas (64660) distinctly', () => {
    expect(parseLeaseAgreementError('User error: 64660')).toMatch(/gas/i);
  });
});

describe('encodeCreateLeaseAgreementParams', () => {
  // A valid account-hash (32 bytes) → Key::Account = tag 0x00 + the 32 bytes.
  const ACCOUNT_HASH =
    'account-hash-0101010101010101010101010101010101010101010101010101010101010101';
  const ACCOUNT_KEY_HEX = '00' + '01'.repeat(32);

  it('concatenates fields in declaration order with no outer length prefix', () => {
    const bytes = encodeCreateLeaseAgreementParams({
      tenantAccountHash: ACCOUNT_HASH,
      equityPropertyId: null,
      monthlyRent: { amount: 250 },
      securityDeposit: { amount: 250 },
      startUnixSeconds: 0,
      endUnixSeconds: 2_592_000,
      invoiceValidityDuration: 0,
    });

    const expected =
      ACCOUNT_KEY_HEX + // tenant Address::Account → Key::Account
      '00' + // equity_option Option::None
      '00' +
      '01fa' + // monthly_rent: None ++ U256(250)
      '00' +
      '01fa' + // security_deposit: None ++ U256(250)
      '0000000000000000' + // start u64 = 0
      '008d270000000000' + // end u64 = 2_592_000
      '0000000000000000'; // invoice_validity_duration u64 = 0

    expect(hex(bytes)).toBe(expected);
  });

  it('encodes Some equity_option', () => {
    const bytes = encodeCreateLeaseAgreementParams({
      tenantAccountHash: ACCOUNT_HASH,
      equityPropertyId: 9,
      monthlyRent: { amount: 1 },
      securityDeposit: { amount: 1 },
      startUnixSeconds: 0,
      endUnixSeconds: 2_592_000,
      invoiceValidityDuration: 0,
    });

    const expected =
      ACCOUNT_KEY_HEX + // tenant
      '01' +
      '0109' + // equity_option Option::Some { property_id U256(9) }
      '00' +
      '0101' + // monthly_rent: None ++ U256(1)
      '00' +
      '0101' + // security_deposit: None ++ U256(1)
      '0000000000000000' +
      '008d270000000000' +
      '0000000000000000';

    expect(hex(bytes)).toBe(expected);
  });
});
