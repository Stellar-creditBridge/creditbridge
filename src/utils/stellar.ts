import { StrKey } from '@stellar/stellar-sdk';

/**
 * Validates whether a given string is a valid Stellar Ed25519 public key (G... 56 chars).
 * Uses official Stellar SDK StrKey cryptographic checksum validation.
 */
export function isValidStellarPublicKey(address: unknown): address is string {
  if (typeof address !== 'string' || !address) return false;
  try {
    return StrKey.isValidEd25519PublicKey(address.trim());
  } catch {
    return false;
  }
}

/**
 * Truncates a Stellar public key for display purposes (e.g. GBBU...B6DY).
 */
export function formatStellarAddress(address: string | null | undefined, prefix = 4, suffix = prefix): string {
  if (!address) return '';
  const trimmed = address.trim();
  if (trimmed.length <= prefix + suffix + 3) return trimmed;
  return `${trimmed.slice(0, prefix)}...${trimmed.slice(-suffix)}`;
}

/**
 * Checks if a given public key corresponds to the authorized protocol admin account.
 */
export function isAdminStellarAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return address.trim() === STELLAR_DEMO_KEYS.ADMIN;
}

/**
 * Standard testnet public keys used for demo mode / seed dataset.
 * All keys are genuine valid Ed25519 public keys.
 */
export const STELLAR_DEMO_KEYS = {
  MAIN_USER: 'GBBUYYLWYM5JMKAKHLJ4OCZGIQ5WCKPL6JVDZ7F6HMDXIJVFP22FB6DY',
  ADMIN: 'GDCKF6ZZRTAEYNWWYDRLDWI7P2QWYW7PYABKAZP4OAGNMQDCL2M77KFR',
  BORROWER_TECH: 'GAJX23T7F5UC763YSFY5QDW5P7KMLS2LXFXT246JKTVC2VUJT5MILWVF',
  BORROWER_RETAIL: 'GDS3L4BEGUCCVU3D6H52JWNGXP5XLI4KSLC2WO5KNVLVMPTUYLFRDQUP',
  BORROWER_LOGISTICS: 'GAWTHY42EN45VT5PIBLJ6SJ4WGITVTPK6GX3SR2GA7KEXBXSCN2VUEWT',
  INVESTOR: 'GALXJGL5HWVC7EF3U7XAQIDEC6XG26W5L67N5I5F3PJCMS7Z6TZMANE6',
} as const;
