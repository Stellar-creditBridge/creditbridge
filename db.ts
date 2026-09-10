import path from 'path';
import fs from 'fs';
import { Invoice, Activity, AuditTrailEntry, Investment } from './src/types';
import { INITIAL_INVOICES, INITIAL_ACTIVITIES, INITIAL_AUDIT_TRAIL, INITIAL_INVESTMENTS } from './src/data';
import { STELLAR_DEMO_KEYS } from './src/utils/stellar';

import DatabaseConstructor from 'better-sqlite3';

let isSqlite = false;
let sqlDb: any = null;

try {
  const dbPath = path.join(process.cwd(), 'creditbridge.db');
  sqlDb = new DatabaseConstructor(dbPath);
  isSqlite = true;
  console.log("Database manager: loaded better-sqlite3 successfully.");
} catch (err) {
  console.warn("WARNING: better-sqlite3 failed to load. Falling back to JSON database file.", err);
  isSqlite = false;
}

const jsonPath = path.join(process.cwd(), 'creditbridge_fallback.json');
let jsonData: {
  users: Record<string, any>;
  invoices: Invoice[];
  activities: Activity[];
  audit_trail: AuditTrailEntry[];
  investments: Investment[];
} = {
  users: {},
  invoices: [],
  activities: [],
  audit_trail: [],
  investments: []
};

// Loader and saver for JSON fallback
function loadJson() {
  if (fs.existsSync(jsonPath)) {
    try {
      jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (!jsonData.investments) {
        jsonData.investments = [...INITIAL_INVESTMENTS];
        saveJson();
      }
    } catch (e) {
      console.error("Error reading fallback JSON database, re-seeding", e);
      seedFallbackJson();
    }
  } else {
    seedFallbackJson();
  }
}

function seedFallbackJson() {
  jsonData = {
    users: {
      [STELLAR_DEMO_KEYS.MAIN_USER]: {
        wallet_address: STELLAR_DEMO_KEYS.MAIN_USER,
        theme: 'light',
        risk_alerts_enabled: 0,
        notification_email: 'anichrisa@gmail.com'
      },
      [STELLAR_DEMO_KEYS.ADMIN]: {
        wallet_address: STELLAR_DEMO_KEYS.ADMIN,
        theme: 'light',
        risk_alerts_enabled: 1,
        notification_email: 'admin@creditbridge.org'
      }
    },
    invoices: INITIAL_INVOICES,
    activities: INITIAL_ACTIVITIES,
    audit_trail: INITIAL_AUDIT_TRAIL,
    investments: INITIAL_INVESTMENTS
  };
  saveJson();
}

function saveJson() {
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error writing fallback JSON database", e);
  }
}

// Database Initialization
if (isSqlite && sqlDb) {
  try {
    // Create tables
    sqlDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        wallet_address TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'light',
        risk_alerts_enabled INTEGER DEFAULT 0,
        notification_email TEXT DEFAULT 'anichrisa@gmail.com'
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        partnerName TEXT NOT NULL,
        industry TEXT NOT NULL,
        amount REAL NOT NULL,
        annualReturn REAL NOT NULL,
        dueDate TEXT NOT NULL,
        fundingProgress REAL DEFAULT 0,
        targetAmount REAL NOT NULL,
        daysRemaining INTEGER NOT NULL,
        status TEXT NOT NULL,
        risk TEXT NOT NULL,
        creatorWallet TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS investments (
        id TEXT PRIMARY KEY,
        invoiceId TEXT NOT NULL,
        investorWallet TEXT NOT NULL,
        amount REAL NOT NULL,
        capturedApr REAL NOT NULL,
        expectedYield REAL NOT NULL,
        expectedReturn REAL NOT NULL,
        timestamp TEXT NOT NULL,
        maturityDate TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        FOREIGN KEY (invoiceId) REFERENCES invoices(id)
      );

      CREATE INDEX IF NOT EXISTS idx_investments_investor ON investments(investorWallet);
      CREATE INDEX IF NOT EXISTS idx_investments_invoice ON investments(invoiceId);

      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        amount TEXT,
        type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_trail (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        eventId TEXT NOT NULL,
        eventName TEXT NOT NULL,
        actionType TEXT NOT NULL,
        details TEXT NOT NULL,
        txHash TEXT,
        operatorWallet TEXT NOT NULL
      );
    `);

    // Check if invoices table is empty, if so, seed
    const invoiceCount = sqlDb.prepare("SELECT COUNT(*) as count FROM invoices").get().count;
    if (invoiceCount === 0) {
      console.log("Seeding SQLite database with initial dataset...");
      
      // Seed users
      sqlDb.prepare(`
        INSERT OR IGNORE INTO users (wallet_address, theme, risk_alerts_enabled, notification_email)
        VALUES (?, 'light', 0, 'anichrisa@gmail.com')
      `).run(STELLAR_DEMO_KEYS.MAIN_USER);

      sqlDb.prepare(`
        INSERT OR IGNORE INTO users (wallet_address, theme, risk_alerts_enabled, notification_email)
        VALUES (?, 'light', 1, 'admin@creditbridge.org')
      `).run(STELLAR_DEMO_KEYS.ADMIN);

      // Seed invoices
      const insertInvoice = sqlDb.prepare(`
        INSERT INTO invoices (id, partnerName, industry, amount, annualReturn, dueDate, fundingProgress, targetAmount, daysRemaining, status, risk, creatorWallet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const inv of INITIAL_INVOICES) {
        insertInvoice.run(
          inv.id,
          inv.partnerName,
          inv.industry,
          inv.amount,
          inv.annualReturn,
          inv.dueDate,
          inv.fundingProgress,
          inv.targetAmount,
          inv.daysRemaining,
          inv.status,
          inv.risk,
          inv.creatorWallet
        );
      }

      // Seed activities
      const insertActivity = sqlDb.prepare(`
        INSERT INTO activities (id, title, timestamp, amount, type)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const act of INITIAL_ACTIVITIES) {
        insertActivity.run(
          act.id,
          act.title,
          act.timestamp,
          act.amount || null,
          act.type
        );
      }

      // Seed audit trail
      const insertAudit = sqlDb.prepare(`
        INSERT INTO audit_trail (id, timestamp, eventId, eventName, actionType, details, txHash, operatorWallet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const trail of INITIAL_AUDIT_TRAIL) {
        insertAudit.run(
          trail.id,
          trail.timestamp,
          trail.eventId,
          trail.eventName,
          trail.actionType,
          trail.details,
          trail.txHash || null,
          trail.operatorWallet
        );
      }
      
      console.log("SQLite database seeding complete.");
    } else {
      // Migrate legacy EVM addresses if present in existing database
      try {
        sqlDb.prepare(`
          UPDATE users 
          SET wallet_address = ? 
          WHERE wallet_address LIKE '0x%'
        `).run(STELLAR_DEMO_KEYS.MAIN_USER);

        sqlDb.prepare(`
          UPDATE invoices 
          SET creatorWallet = ? 
          WHERE creatorWallet = '0x4b...4e2a'
        `).run(STELLAR_DEMO_KEYS.MAIN_USER);

        sqlDb.prepare(`
          UPDATE invoices 
          SET creatorWallet = ? 
          WHERE creatorWallet = '0x9a...3f1c'
        `).run(STELLAR_DEMO_KEYS.BORROWER_RETAIL);

        sqlDb.prepare(`
          UPDATE invoices 
          SET creatorWallet = ? 
          WHERE creatorWallet = '0x6c...11a2'
        `).run(STELLAR_DEMO_KEYS.BORROWER_LOGISTICS);

        sqlDb.prepare(`
          UPDATE invoices 
          SET creatorWallet = ? 
          WHERE creatorWallet = '0x5b...829a'
        `).run(STELLAR_DEMO_KEYS.BORROWER_TECH);

        // Ensure admin user exists in users table
        sqlDb.prepare(`
          INSERT OR IGNORE INTO users (wallet_address, theme, risk_alerts_enabled, notification_email)
          VALUES (?, 'light', 1, 'admin@creditbridge.org')
        `).run(STELLAR_DEMO_KEYS.ADMIN);
      } catch (migErr) {
        console.warn("Database address migration notice:", migErr);
      }
    }

    // Ensure investments table is seeded if empty
    try {
      const investmentCount = sqlDb.prepare("SELECT COUNT(*) as count FROM investments").get().count;
      if (investmentCount === 0) {
        console.log("Seeding SQLite database with initial investment positions...");
        const insertInvestment = sqlDb.prepare(`
          INSERT INTO investments (id, invoiceId, investorWallet, amount, capturedApr, expectedYield, expectedReturn, timestamp, maturityDate, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const inv of INITIAL_INVESTMENTS) {
          insertInvestment.run(
            inv.id,
            inv.invoiceId,
            inv.investorWallet,
            inv.amount,
            inv.capturedApr,
            inv.expectedYield,
            inv.expectedReturn,
            inv.timestamp,
            inv.maturityDate,
            inv.status
          );
        }
      }
    } catch (invErr) {
      console.warn("Investment table initialization check notice:", invErr);
    }
  } catch (err) {
    console.error("Failed to initialize SQLite database, switching to JSON fallback.", err);
    isSqlite = false;
    loadJson();
  }
} else {
  loadJson();
}

// Database APIs
export function getInvoices(): Invoice[] {
  if (isSqlite) {
    try {
      return sqlDb.prepare("SELECT * FROM invoices ORDER BY id DESC").all();
    } catch (err) {
      console.error("SQL getInvoices error, using fallback", err);
      return [];
    }
  } else {
    return jsonData.invoices;
  }
}

export function addInvoice(invoice: Invoice) {
  if (isSqlite) {
    try {
      const stmt = sqlDb.prepare(`
        INSERT INTO invoices (id, partnerName, industry, amount, annualReturn, dueDate, fundingProgress, targetAmount, daysRemaining, status, risk, creatorWallet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        invoice.id,
        invoice.partnerName,
        invoice.industry,
        invoice.amount,
        invoice.annualReturn,
        invoice.dueDate,
        invoice.fundingProgress,
        invoice.targetAmount,
        invoice.daysRemaining,
        invoice.status,
        invoice.risk,
        invoice.creatorWallet
      );
    } catch (err) {
      console.error("SQL addInvoice error", err);
    }
  } else {
    jsonData.invoices.unshift(invoice);
    saveJson();
  }
}

export function investInvoice(id: string, progress: number, status: string) {
  if (isSqlite) {
    try {
      const stmt = sqlDb.prepare(`
        UPDATE invoices SET fundingProgress = ?, status = ? WHERE id = ?
      `);
      stmt.run(progress, status, id);
    } catch (err) {
      console.error("SQL investInvoice error", err);
    }
  } else {
    const inv = jsonData.invoices.find(i => i.id === id);
    if (inv) {
      inv.fundingProgress = progress;
      inv.status = status as any;
      saveJson();
    }
  }
}

export function repayInvoice(id: string) {
  if (isSqlite) {
    try {
      const tx = sqlDb.transaction(() => {
        sqlDb.prepare(`
          UPDATE invoices SET status = 'Paid', fundingProgress = 100 WHERE id = ?
        `).run(id);
        sqlDb.prepare(`
          UPDATE investments SET status = 'Settled' WHERE invoiceId = ? AND status = 'Active'
        `).run(id);
      });
      tx();
    } catch (err) {
      console.error("SQL repayInvoice error", err);
    }
  } else {
    const inv = jsonData.invoices.find(i => i.id === id);
    if (inv) {
      inv.status = 'Paid';
      inv.fundingProgress = 100;
    }
    if (jsonData.investments) {
      jsonData.investments.forEach(pos => {
        if (pos.invoiceId === id && pos.status === 'Active') {
          pos.status = 'Settled';
        }
      });
    }
    saveJson();
  }
}

// Investment Ledger APIs
export function getInvestments(): Investment[] {
  if (isSqlite) {
    try {
      return sqlDb.prepare("SELECT * FROM investments ORDER BY timestamp DESC").all();
    } catch (err) {
      console.error("SQL getInvestments error, using fallback", err);
      return [];
    }
  } else {
    return jsonData.investments || [];
  }
}

export function getInvestmentsByInvestor(investorWallet: string): Investment[] {
  if (isSqlite) {
    try {
      return sqlDb.prepare("SELECT * FROM investments WHERE investorWallet = ? ORDER BY timestamp DESC").all(investorWallet);
    } catch (err) {
      console.error("SQL getInvestmentsByInvestor error", err);
      return [];
    }
  } else {
    return (jsonData.investments || []).filter(i => i.investorWallet === investorWallet);
  }
}

export function getInvestmentsByInvoice(invoiceId: string): Investment[] {
  if (isSqlite) {
    try {
      return sqlDb.prepare("SELECT * FROM investments WHERE invoiceId = ? ORDER BY timestamp DESC").all(invoiceId);
    } catch (err) {
      console.error("SQL getInvestmentsByInvoice error", err);
      return [];
    }
  } else {
    return (jsonData.investments || []).filter(i => i.invoiceId === invoiceId);
  }
}

export function getInvestmentById(id: string): Investment | undefined {
  if (isSqlite) {
    try {
      return sqlDb.prepare("SELECT * FROM investments WHERE id = ?").get(id);
    } catch (err) {
      console.error("SQL getInvestmentById error", err);
      return undefined;
    }
  } else {
    return (jsonData.investments || []).find(i => i.id === id);
  }
}

export function recordInvestment(
  investment: Investment,
  newProgress: number,
  newStatus: string,
  activity: Activity,
  auditEntry: AuditTrailEntry
): boolean {
  if (isSqlite) {
    try {
      const tx = sqlDb.transaction(() => {
        // 1. Insert individual investment record into ledger
        sqlDb.prepare(`
          INSERT INTO investments (id, invoiceId, investorWallet, amount, capturedApr, expectedYield, expectedReturn, timestamp, maturityDate, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          investment.id,
          investment.invoiceId,
          investment.investorWallet,
          investment.amount,
          investment.capturedApr,
          investment.expectedYield,
          investment.expectedReturn,
          investment.timestamp,
          investment.maturityDate,
          investment.status
        );

        // 2. Update aggregate invoice funding atomically
        sqlDb.prepare(`
          UPDATE invoices SET fundingProgress = ?, status = ? WHERE id = ?
        `).run(newProgress, newStatus, investment.invoiceId);

        // 3. Record platform activity
        sqlDb.prepare(`
          INSERT INTO activities (id, title, timestamp, amount, type)
          VALUES (?, ?, ?, ?, ?)
        `).run(activity.id, activity.title, activity.timestamp, activity.amount || null, activity.type);

        // 4. Record audit trail entry
        sqlDb.prepare(`
          INSERT INTO audit_trail (id, timestamp, eventId, eventName, actionType, details, txHash, operatorWallet)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          auditEntry.id,
          auditEntry.timestamp,
          auditEntry.eventId,
          auditEntry.eventName,
          auditEntry.actionType,
          auditEntry.details,
          auditEntry.txHash || null,
          auditEntry.operatorWallet
        );
      });
      tx();
      return true;
    } catch (err) {
      console.error("SQL recordInvestment transaction error", err);
      throw err;
    }
  } else {
    if (!jsonData.investments) jsonData.investments = [];
    jsonData.investments.unshift(investment);
    const inv = jsonData.invoices.find(i => i.id === investment.invoiceId);
    if (inv) {
      inv.fundingProgress = newProgress;
      inv.status = newStatus as any;
    }
    jsonData.activities.unshift(activity);
    jsonData.audit_trail.unshift(auditEntry);
    saveJson();
    return true;
  }
}

export function updateInvoiceRisk(id: string, risk: 'Low Risk' | 'Stable' | 'Moderate') {
  if (isSqlite) {
    try {
      const stmt = sqlDb.prepare(`
        UPDATE invoices SET risk = ? WHERE id = ?
      `);
      stmt.run(risk, id);
    } catch (err) {
      console.error("SQL updateInvoiceRisk error", err);
    }
  } else {
    const inv = jsonData.invoices.find(i => i.id === id);
    if (inv) {
      inv.risk = risk;
      saveJson();
    }
  }
}

export function getActivities(): Activity[] {
  if (isSqlite) {
    try {
      return sqlDb.prepare("SELECT * FROM activities ORDER BY id DESC").all();
    } catch (err) {
      console.error("SQL getActivities error", err);
      return [];
    }
  } else {
    return jsonData.activities;
  }
}

export function addActivity(activity: Activity) {
  if (isSqlite) {
    try {
      const stmt = sqlDb.prepare(`
        INSERT INTO activities (id, title, timestamp, amount, type)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(activity.id, activity.title, activity.timestamp, activity.amount || null, activity.type);
    } catch (err) {
      console.error("SQL addActivity error", err);
    }
  } else {
    jsonData.activities.unshift(activity);
    saveJson();
  }
}

export function getAuditTrail(): AuditTrailEntry[] {
  if (isSqlite) {
    try {
      return sqlDb.prepare("SELECT * FROM audit_trail ORDER BY timestamp DESC").all();
    } catch (err) {
      console.error("SQL getAuditTrail error", err);
      return [];
    }
  } else {
    return jsonData.audit_trail;
  }
}

export function addAuditEntry(entry: AuditTrailEntry) {
  if (isSqlite) {
    try {
      const stmt = sqlDb.prepare(`
        INSERT INTO audit_trail (id, timestamp, eventId, eventName, actionType, details, txHash, operatorWallet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        entry.id,
        entry.timestamp,
        entry.eventId,
        entry.eventName,
        entry.actionType,
        entry.details,
        entry.txHash || null,
        entry.operatorWallet
      );
    } catch (err) {
      console.error("SQL addAuditEntry error", err);
    }
  } else {
    jsonData.audit_trail.unshift(entry);
    saveJson();
  }
}

export function getUserSettings(walletAddress: string) {
  if (isSqlite) {
    try {
      let user = sqlDb.prepare("SELECT * FROM users WHERE wallet_address = ?").get(walletAddress);
      if (!user) {
        // Insert default settings
        sqlDb.prepare(`
          INSERT INTO users (wallet_address, theme, risk_alerts_enabled, notification_email)
          VALUES (?, 'light', 0, 'anichrisa@gmail.com')
        `).run(walletAddress);
        user = {
          wallet_address: walletAddress,
          theme: 'light',
          risk_alerts_enabled: 0,
          notification_email: 'anichrisa@gmail.com'
        };
      }
      // Convert 1/0 from SQLite to boolean
      return {
        wallet_address: user.wallet_address,
        theme: user.theme,
        risk_alerts_enabled: user.risk_alerts_enabled === 1,
        notification_email: user.notification_email
      };
    } catch (err) {
      console.error("SQL getUserSettings error", err);
      return {
        wallet_address: walletAddress,
        theme: 'light',
        risk_alerts_enabled: false,
        notification_email: 'anichrisa@gmail.com'
      };
    }
  } else {
    if (!jsonData.users[walletAddress]) {
      jsonData.users[walletAddress] = {
        wallet_address: walletAddress,
        theme: 'light',
        risk_alerts_enabled: false,
        notification_email: 'anichrisa@gmail.com'
      };
      saveJson();
    }
    return jsonData.users[walletAddress];
  }
}

export function updateUserSettings(walletAddress: string, theme: string, riskAlertsEnabled: boolean, notificationEmail: string) {
  if (isSqlite) {
    try {
      const numericAlerts = riskAlertsEnabled ? 1 : 0;
      sqlDb.prepare(`
        UPDATE users SET theme = ?, risk_alerts_enabled = ?, notification_email = ? WHERE wallet_address = ?
      `).run(theme, numericAlerts, notificationEmail, walletAddress);
    } catch (err) {
      console.error("SQL updateUserSettings error", err);
    }
  } else {
    jsonData.users[walletAddress] = {
      wallet_address: walletAddress,
      theme,
      risk_alerts_enabled: riskAlertsEnabled,
      notification_email: notificationEmail
    };
    saveJson();
  }
}

export function restoreAuditTrail() {
  if (isSqlite) {
    try {
      sqlDb.exec("DELETE FROM audit_trail");
      const insertAudit = sqlDb.prepare(`
        INSERT INTO audit_trail (id, timestamp, eventId, eventName, actionType, details, txHash, operatorWallet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const trail of INITIAL_AUDIT_TRAIL) {
        insertAudit.run(
          trail.id,
          trail.timestamp,
          trail.eventId,
          trail.eventName,
          trail.actionType,
          trail.details,
          trail.txHash || null,
          trail.operatorWallet
        );
      }
    } catch (err) {
      console.error("SQL restoreAuditTrail error", err);
    }
  } else {
    jsonData.audit_trail = [...INITIAL_AUDIT_TRAIL];
    saveJson();
  }
}

export function clearAuditTrail() {
  if (isSqlite) {
    try {
      sqlDb.exec("DELETE FROM audit_trail");
    } catch (err) {
      console.error("SQL clearAuditTrail error", err);
    }
  } else {
    jsonData.audit_trail = [];
    saveJson();
  }
}
