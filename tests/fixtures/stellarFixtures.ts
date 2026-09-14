import { STELLAR_DEMO_KEYS } from '../../src/utils/stellar';
import { Invoice, Investment } from '../../src/types';

export const FIXTURE_WALLETS = {
  ADMIN: STELLAR_DEMO_KEYS.ADMIN,
  MAIN_USER: STELLAR_DEMO_KEYS.MAIN_USER,
  INVESTOR: STELLAR_DEMO_KEYS.INVESTOR,
  BORROWER_RETAIL: STELLAR_DEMO_KEYS.BORROWER_RETAIL,
  BORROWER_LOGISTICS: STELLAR_DEMO_KEYS.BORROWER_LOGISTICS,
  BORROWER_TECH: STELLAR_DEMO_KEYS.BORROWER_TECH,
  // Additional valid Ed25519 addresses for multi-investor testing
  INVESTOR_A: 'GCPPA2EQMQM7TBTFZQQRAINC43NJXIMNJ5R2SNEMWOA2366PQBWGF6JX',
  INVESTOR_B: 'GDNBRC3JYOLM7DDMAIBM74CH7W7MJII7B4XHXZM5CYOLQJNHQ5AC67W6',
  // Invalid addresses for security/regression checks
  INVALID_EVM: '0x4b702951C81878b172a81876D80996Ec19FF4e2a',
  INVALID_LENGTH: 'GBBUYYLWYM5JMKAKHLJ4OCZGIQ5WCKPL6JVDZ7F6HMDXIJVFP22FB6D',
  INVALID_CHECKSUM: 'GBBUYYLWYM5JMKAKHLJ4OCZGIQ5WCKPL6JVDZ7F6HMDXIJVFP22FB6ZZ',
  EMPTY_STRING: '',
};

export const FIXTURE_INVOICE: Invoice = {
  id: 'CB-TEST-001',
  partnerName: 'Apex Logistics Freight LLC',
  industry: 'Logistics',
  amount: 50000,
  annualReturn: 12.0,
  dueDate: '2026-10-31',
  fundingProgress: 0,
  targetAmount: 50000,
  daysRemaining: 48,
  status: 'Pending',
  risk: 'Low Risk',
  creatorWallet: FIXTURE_WALLETS.BORROWER_LOGISTICS
};

export const FIXTURE_HORIZON_ROOT = {
  horizon_version: '2.30.0',
  core_version: 'v21.1.0',
  current_protocol_version: 21,
  network_passphrase: 'Test SDF Network ; September 2015',
};

export const FIXTURE_HORIZON_LEDGERS = {
  records: [
    {
      sequence: 1234567,
      closed_at: '2026-09-13T12:00:05Z',
      base_fee_in_stroops: 100,
      successful_transaction_count: 14,
      operation_count: 28
    },
    {
      sequence: 1234566,
      closed_at: '2026-09-13T12:00:00Z',
      base_fee_in_stroops: 100,
      successful_transaction_count: 9,
      operation_count: 18
    }
  ]
};

export const FIXTURE_HORIZON_FEE_STATS = {
  last_ledger_base_fee: '100',
  fee_charged: {
    min: '100',
    mode: '100',
    p50: '100'
  },
  ledger_capacity_usage: '0.1250'
};
