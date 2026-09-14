// Test environment setup - ensures isolated test execution
import { beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

// Set deterministic testing environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3999';
process.env.JWT_SECRET = 'test-jwt-secret-deterministic-key-12345';
process.env.STELLAR_NETWORK = 'testnet';
process.env.DISABLE_HMR = 'true';

// Temporary test SQLite database path - unique per worker/run to prevent file contention
const testDbPath = path.join(process.cwd(), `creditbridge_test_${process.pid}.db`);
process.env.SQLITE_DB_PATH = testDbPath;

beforeAll(() => {
  // Setup test environment
});

afterAll(() => {
  // Cleanup test database file
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch {
      // Ignored if busy
    }
  }
});
