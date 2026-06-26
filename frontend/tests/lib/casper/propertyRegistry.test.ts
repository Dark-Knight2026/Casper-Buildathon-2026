import { describe, expect, it } from 'vitest';

import {
  encodeCreatePropertyParams,
  encodePropertyStatus,
  parsePropertyRegistryError,
  propertyStatusDiscriminant,
  stringToBytes,
  u256ToBytes,
} from '@/lib/casper/propertyRegistry';
import { PROPERTY_ONCHAIN_STATUSES } from '@/types/propertyOnChain';

const hex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

describe('u256ToBytes', () => {
  it('serializes zero as a single length byte', () => {
    expect(Array.from(u256ToBytes(0n))).toEqual([0]);
    expect(Array.from(u256ToBytes('0'))).toEqual([0]);
  });

  it('serializes small values as length-prefixed little-endian', () => {
    expect(Array.from(u256ToBytes(1n))).toEqual([1, 1]);
    expect(Array.from(u256ToBytes(255n))).toEqual([1, 0xff]);
    expect(Array.from(u256ToBytes(256n))).toEqual([2, 0x00, 0x01]);
    expect(Array.from(u256ToBytes(1000000n))).toEqual([3, 0x40, 0x42, 0x0f]);
  });

  it('accepts decimal strings and bigints equivalently', () => {
    expect(hex(u256ToBytes('123456789'))).toBe(hex(u256ToBytes(123456789n)));
  });

  it('rejects negative and over-U256 values', () => {
    expect(() => u256ToBytes(-1n)).toThrow();
    expect(() => u256ToBytes(1n << 256n)).toThrow();
  });
});

describe('stringToBytes', () => {
  it('prefixes with a u32 little-endian length', () => {
    expect(Array.from(stringToBytes(''))).toEqual([0, 0, 0, 0]);
    expect(Array.from(stringToBytes('ab'))).toEqual([2, 0, 0, 0, 0x61, 0x62]);
  });

  it('encodes UTF-8 length, not character count', () => {
    // "é" is 2 UTF-8 bytes.
    expect(Array.from(stringToBytes('é'))).toEqual([2, 0, 0, 0, 0xc3, 0xa9]);
  });
});

describe('encodeCreatePropertyParams', () => {
  it('concatenates issuer, total_supply, metadata_uri in declaration order', () => {
    const bytes = encodeCreatePropertyParams({
      issuerUserId: 7n,
      totalSupply: 1000n,
      metadataUri: 'ipfs://cid',
    });
    // issuer 7 -> [01 07]; total_supply 1000 = 0x03e8 -> [02 e8 03];
    // "ipfs://cid" is 10 bytes -> [0a 00 00 00] + utf8.
    const expected =
      '0107' +
      '02e803' +
      '0a000000' +
      hex(new TextEncoder().encode('ipfs://cid'));
    expect(hex(bytes)).toBe(expected);
  });
});

describe('PropertyStatus encoding', () => {
  it('maps the lifecycle statuses to their contract discriminants', () => {
    expect(propertyStatusDiscriminant('draft')).toBe(0);
    expect(propertyStatusDiscriminant('active')).toBe(1);
    expect(propertyStatusDiscriminant('paused')).toBe(2);
    expect(propertyStatusDiscriminant('sold')).toBe(3);
    expect(propertyStatusDiscriminant('liquidating')).toBe(4);
    expect(propertyStatusDiscriminant('closed')).toBe(5);
  });

  it('encodes a status as a single discriminant byte', () => {
    PROPERTY_ONCHAIN_STATUSES.forEach((status, index) => {
      expect(Array.from(encodePropertyStatus(status))).toEqual([index]);
    });
  });
});

describe('parsePropertyRegistryError', () => {
  it('maps known user-error discriminants to friendly copy', () => {
    expect(parsePropertyRegistryError('User error: 902')).toMatch(
      /greater than zero/i
    );
    expect(parsePropertyRegistryError('User error: 905')).toMatch(
      /ownership token/i
    );
    expect(parsePropertyRegistryError('User error: 910')).toMatch(/issuer/i);
  });

  it('flags an unfunded wallet from a node-level message', () => {
    expect(parsePropertyRegistryError('insufficient balance')).toMatch(
      /testnet CSPR/i
    );
  });

  it('passes through unknown messages and handles the empty case', () => {
    expect(parsePropertyRegistryError('User error: 4242')).toBe(
      'User error: 4242'
    );
    expect(parsePropertyRegistryError()).toMatch(/failed/i);
  });
});
