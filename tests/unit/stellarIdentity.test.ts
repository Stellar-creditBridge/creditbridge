import { describe, it, expect } from 'vitest';
import { 
  isValidStellarPublicKey, 
  formatStellarAddress, 
  isAdminStellarAddress, 
  getStellarExplorerUrl,
  STELLAR_DEMO_KEYS 
} from '../../src/utils/stellar';
import { FIXTURE_WALLETS } from '../fixtures/stellarFixtures';

describe('Stellar Ed25519 Identity & Cryptographic Address Validation', () => {

  describe('Public Key Validation (isValidStellarPublicKey)', () => {
    it('accepts valid 56-character Ed25519 Stellar public keys with valid StrKey checksums', () => {
      expect(isValidStellarPublicKey(FIXTURE_WALLETS.ADMIN)).toBe(true);
      expect(isValidStellarPublicKey(FIXTURE_WALLETS.MAIN_USER)).toBe(true);
      expect(isValidStellarPublicKey(FIXTURE_WALLETS.INVESTOR)).toBe(true);
      expect(isValidStellarPublicKey(FIXTURE_WALLETS.BORROWER_LOGISTICS)).toBe(true);
    });

    it('rejects EVM-style hexadecimal (0x...) addresses without exception', () => {
      expect(isValidStellarPublicKey(FIXTURE_WALLETS.INVALID_EVM)).toBe(false);
      expect(isValidStellarPublicKey('0x0000000000000000000000000000000000000000')).toBe(false);
    });

    it('rejects malformed public keys (truncated, wrong prefix, bad checksum)', () => {
      // Truncated (55 chars)
      expect(isValidStellarPublicKey(FIXTURE_WALLETS.INVALID_LENGTH)).toBe(false);
      // Bad checksum
      expect(isValidStellarPublicKey(FIXTURE_WALLETS.INVALID_CHECKSUM)).toBe(false);
      // Starts with S (Secret seed! Must be rejected as public key)
      expect(isValidStellarPublicKey('SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
      // Empty string and null/undefined
      expect(isValidStellarPublicKey('')).toBe(false);
      expect(isValidStellarPublicKey(null)).toBe(false);
      expect(isValidStellarPublicKey(undefined)).toBe(false);
      expect(isValidStellarPublicKey(12345)).toBe(false);
    });
  });

  describe('Address Truncation & Formatting (formatStellarAddress)', () => {
    it('formats address into standard G... prefix and suffix', () => {
      const formatted = formatStellarAddress(FIXTURE_WALLETS.MAIN_USER, 4, 4);
      expect(formatted).toBe('GBBU...B6DY');
    });

    it('handles invalid addresses or empty inputs gracefully without throwing', () => {
      expect(formatStellarAddress('')).toBe('');
      expect(formatStellarAddress(null as any)).toBe('');
      expect(formatStellarAddress('ShortKey')).toBe('ShortKey');
    });
  });

  describe('Admin Authorization Check (isAdminStellarAddress)', () => {
    it('authorizes defined admin Stellar address', () => {
      expect(isAdminStellarAddress(FIXTURE_WALLETS.ADMIN)).toBe(true);
    });

    it('denies standard user or investor addresses as admin', () => {
      expect(isAdminStellarAddress(FIXTURE_WALLETS.MAIN_USER)).toBe(false);
      expect(isAdminStellarAddress(FIXTURE_WALLETS.INVESTOR)).toBe(false);
      expect(isAdminStellarAddress(FIXTURE_WALLETS.INVESTOR_A)).toBe(false);
      expect(isAdminStellarAddress('')).toBe(false);
    });
  });

  describe('Stellar.Expert Explorer URL Generation (getStellarExplorerUrl)', () => {
    it('constructs correct testnet URL for transactions', () => {
      const txHash = 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678';
      const url = getStellarExplorerUrl('tx', txHash, 'testnet');
      expect(url).toBe(`https://stellar.expert/explorer/testnet/tx/${txHash}`);
    });

    it('constructs correct testnet URL for accounts and ledgers', () => {
      const accountUrl = getStellarExplorerUrl('account', FIXTURE_WALLETS.MAIN_USER, 'testnet');
      expect(accountUrl).toBe(`https://stellar.expert/explorer/testnet/account/${FIXTURE_WALLETS.MAIN_USER}`);

      const ledgerUrl = getStellarExplorerUrl('ledger', 123456, 'testnet');
      expect(ledgerUrl).toBe('https://stellar.expert/explorer/testnet/ledger/123456');
    });
  });

});
