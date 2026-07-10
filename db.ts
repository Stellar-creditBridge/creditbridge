import path from 'path';
import fs from 'fs';
import { Invoice, Activity, AuditTrailEntry } from './src/types';
import { INITIAL_INVOICES, INITIAL_ACTIVITIES, INITIAL_AUDIT_TRAIL } from './src/data';

let Database: any = null;
let isSqlite = false;
let sqlDb: any = null;

try {
  // Dynamic import of better-sqlite3
  const sqliteModule = await import('better-sqlite3');
  Database = sqliteModule.default;
  isSqlite = true;
  console.log("Database manager: loaded better-sqlite3 successfully.");
} catch (err) {
  console.warn("WARNING: better-sqlite3 failed to load. Falling back to JSON database file.", err);
}

const jsonPath = path.join(process.cwd(), 'creditbridge_fallback.json');
let jsonData: {
  users: Record<string, any>;
  invoices: Invoice[];
  activities: Activity[];
  audit_trail: AuditTrailEntry[];
} = {
  users: {},
  invoices: [],
  activities: [],
  audit_trail: []
};

// Loader and saver for JSON fallback
function loadJson() {
  if (fs.existsSync(jsonPath)) {
    try {
      jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
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
      '0x4b789123cba7f9e8a512400f912431682494e2a': {
        wallet_address: '0x4b789123cba7f9e8a512400f912431682494e2a',
        theme: 'light',
        risk_alerts_enabled: 0,
        notification_email: 'anichrisa@gmail.com'
      }
    },
    invoices: INITIAL_INVOICES,
    activities: INITIAL_ACTIVITIES,
    audit_trail: INITIAL_AUDIT_TRAIL
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
if (isSqlite) {
  try {
    const dbPath = path.join(process.cwd(), 'creditbridge.db');
    sqlDb = new Database(dbPath);
    
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
        VALUES ('0x4b789123cba7f9e8a512400f912431682494e2a', 'light', 0, 'anichrisa@gmail.com')
      `).run();

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
      const stmt = sqlDb.prepare(`
        UPDATE invoices SET status = 'Paid', fundingProgress = 100 WHERE id = ?
      `);
      stmt.run(id);
    } catch (err) {
      console.error("SQL repayInvoice error", err);
    }
  } else {
    const inv = jsonData.invoices.find(i => i.id === id);
    if (inv) {
      inv.status = 'Paid';
      inv.fundingProgress = 100;
      saveJson();
    }
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
