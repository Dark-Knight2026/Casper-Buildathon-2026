import { describe, expect, it } from 'vitest';

import { prefixSignature } from './signature';

const RAW = 'a'.repeat(128); // a raw signature is 128 hex chars

describe('prefixSignature', () => {
  it('prepends 01 for an Ed25519 (01…) public key', () => {
    expect(prefixSignature('0188aa…', RAW)).toBe(`01${RAW}`);
  });

  it('prepends 02 for a Secp256k1 (02…) public key', () => {
    expect(prefixSignature('0233aa…', RAW)).toBe(`02${RAW}`);
  });

  it('leaves an already-prefixed (130-char) signature untouched', () => {
    const prefixed = `02${RAW}`; // 130 chars
    expect(prefixSignature('0188aa…', prefixed)).toBe(prefixed);
  });

  it('prefixes by length, not by the signature’s leading bytes', () => {
    // A raw sig that itself starts with 02 must still get the key's prefix.
    const rawStartingWith02 = `02${'b'.repeat(126)}`; // 128 chars
    expect(prefixSignature('0199…', rawStartingWith02)).toBe(
      `01${rawStartingWith02}`
    );
  });
});
