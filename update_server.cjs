const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

// 1. Add imports
server = server.replace(
  'import * as db from "./db";',
  `import * as db from "./db";
import { z } from "zod";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// --- Zod Schemas ---
const riskScoringSchema = z.object({
  partnerName: z.string().min(1),
  industry: z.string().min(1),
  amount: z.number().positive(),
  annualReturn: z.number().positive(),
  daysRemaining: z.number().int().nonnegative(),
  riskRating: z.string().optional(),
});

const invoiceSchema = z.object({
  id: z.string().min(1),
  partnerName: z.string().min(1),
  industry: z.enum(['Logistics', 'Technology', 'Healthcare', 'Energy', 'Retail']),
  amount: z.number().positive(),
  annualReturn: z.number().positive(),
  dueDate: z.string().min(1),
  fundingProgress: z.number().min(0).max(100),
  targetAmount: z.number().positive(),
  daysRemaining: z.number().int().nonnegative(),
  status: z.enum(['Funded', 'Pending', 'Due Soon', 'Paid']),
  risk: z.enum(['Low Risk', 'Moderate', 'Stable']),
  creatorWallet: z.string().min(1)
});

const investSchema = z.object({
  investAmount: z.number().positive(),
  operatorWallet: z.string().min(1)
});

const riskUpdateSchema = z.object({
  newRisk: z.enum(['Low Risk', 'Moderate', 'Stable']),
  oldRisk: z.enum(['Low Risk', 'Moderate', 'Stable']),
  operatorWallet: z.string().optional()
});

const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'midnight', 'system']).optional(),
  riskAlertsEnabled: z.boolean().optional(),
  notificationEmail: z.string().email().optional().or(z.literal(''))
});`
);

// 2. Add Middlewares
server = server.replace(
  '// Middleware\n  app.use(express.json());',
  `// Middleware
  app.use(express.json());
  app.use(cors());
  app.use(morgan('dev'));

  // Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
  });
  
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many AI analysis requests, please try again later.' }
  });

  app.use(globalLimiter);
  app.use('/api/risk-scoring', aiLimiter);
  app.use('/api/market-sentiment', aiLimiter);

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    console.warn("⚠️  WARNING: GEMINI_API_KEY is not set. The app will use high-fidelity simulated local responses for AI endpoints.");
  }`
);

// 3. Risk scoring validation
server = server.replace(
  /const \{ partnerName, industry, amount, annualReturn, daysRemaining, riskRating \} = req\.body;\s+if \(!partnerName \|\| !industry\) \{\s+return res\.status\(400\)\.json\(\{ error: "Missing partnerName or industry in request body\." \}\);\s+\}/,
  `const parseResult = riskScoringSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request parameters", details: parseResult.error.errors });
      }
      const { partnerName, industry, amount, annualReturn, daysRemaining, riskRating } = parseResult.data;`
);

// 4. Create Invoice validation
server = server.replace(
  /const invoice = req\.body;\s+db\.addInvoice\(invoice\);/,
  `const parseResult = invoiceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid invoice data", details: parseResult.error.errors });
      }
      const invoice = parseResult.data as any; // Allow cast back to db entity
      db.addInvoice(invoice);`
);

// 5. Invest Invoice validation
server = server.replace(
  /const \{ investAmount, operatorWallet \} = req\.body;/,
  `const parseResult = investSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid investment parameters", details: parseResult.error.errors });
      }
      const { investAmount, operatorWallet } = parseResult.data;`
);

// 6. Mutate Risk Level validation
server = server.replace(
  /const \{ newRisk, oldRisk, operatorWallet \} = req\.body;/,
  `const parseResult = riskUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid risk update parameters", details: parseResult.error.errors });
      }
      const { newRisk, oldRisk, operatorWallet } = parseResult.data;`
);

// 7. Update User settings validation
server = server.replace(
  /const \{ theme, riskAlertsEnabled, notificationEmail \} = req\.body;/,
  `const parseResult = userSettingsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid user settings parameters", details: parseResult.error.errors });
      }
      const { theme, riskAlertsEnabled, notificationEmail } = parseResult.data;`
);

fs.writeFileSync('server.ts', server);
console.log("Updated server.ts successfully");
