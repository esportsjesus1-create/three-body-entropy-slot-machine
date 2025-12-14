/**
 * Database Service
 * 
 * In-memory database for development and proof of concept.
 * Data will be lost when the app restarts.
 */

import { v4 as uuidv4 } from 'uuid';

export interface Partner {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended' | 'pending';
  creditLimitCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  partnerId: string;
  key: string;
  name: string;
  status: 'active' | 'suspended' | 'revoked';
  rateLimit: number;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface Spin {
  id: string;
  partnerId: string;
  apiKeyId: string;
  sessionId: string;
  commitment: string;
  houseSeed: string;
  clientSeed?: string;
  result?: SpinResult;
  proof?: SpinProof;
  feeCents: number;
  createdAt: Date;
  revealedAt?: Date;
}

export interface SpinResult {
  symbols: string[];
  positions: number[];
  winAmount: number;
  multiplier: number;
}

export interface SpinProof {
  thetaAngles: number[];
  entropyHex: string;
  combinedSeedHash: string;
  verificationHash: string;
}

export interface LedgerEntry {
  id: string;
  partnerId: string;
  amountCents: number;
  type: 'spin_fee' | 'payment' | 'refund' | 'adjustment';
  spinId?: string;
  invoiceId?: string;
  description: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  partnerId: string;
  periodStart: Date;
  periodEnd: Date;
  amountCents: number;
  status: 'pending' | 'paid' | 'overdue';
  dueAt: Date;
  paidAt?: Date;
  createdAt: Date;
}

export class DatabaseService {
  private partners: Map<string, Partner> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private spins: Map<string, Spin> = new Map();
  private ledgerEntries: Map<string, LedgerEntry> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private partnerBalances: Map<string, number> = new Map();

  constructor() {
    // Initialize with a demo partner and API key
    this.seedDemoData();
    console.log('Database service initialized (in-memory mode)');
  }

  private seedDemoData(): void {
    const demoPartnerId = 'demo-partner-001';
    const demoApiKeyId = 'demo-apikey-001';
    
    this.partners.set(demoPartnerId, {
      id: demoPartnerId,
      name: 'Demo Partner',
      email: 'demo@entropy-slots.com',
      status: 'active',
      creditLimitCents: 1000000, // $10,000
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.apiKeys.set('demo_key_12345', {
      id: demoApiKeyId,
      partnerId: demoPartnerId,
      key: 'demo_key_12345',
      name: 'Demo API Key',
      status: 'active',
      rateLimit: 1000,
      createdAt: new Date()
    });

    this.partnerBalances.set(demoPartnerId, 0);
  }

  // Partner methods
  async getPartner(id: string): Promise<Partner | null> {
    return this.partners.get(id) || null;
  }

  async getPartnerByApiKey(apiKey: string): Promise<{ partner: Partner; apiKeyRecord: ApiKey } | null> {
    const apiKeyRecord = this.apiKeys.get(apiKey);
    if (!apiKeyRecord) return null;

    const partner = this.partners.get(apiKeyRecord.partnerId);
    if (!partner) return null;

    return { partner, apiKeyRecord };
  }

  async createPartner(data: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>): Promise<Partner> {
    const partner: Partner = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.partners.set(partner.id, partner);
    this.partnerBalances.set(partner.id, 0);
    return partner;
  }

  async updatePartnerStatus(id: string, status: Partner['status']): Promise<void> {
    const partner = this.partners.get(id);
    if (partner) {
      partner.status = status;
      partner.updatedAt = new Date();
    }
  }

  // API Key methods
  async createApiKey(partnerId: string, name: string): Promise<ApiKey> {
    const key = `pk_${uuidv4().replace(/-/g, '')}`;
    const apiKey: ApiKey = {
      id: uuidv4(),
      partnerId,
      key,
      name,
      status: 'active',
      rateLimit: 1000,
      createdAt: new Date()
    };
    this.apiKeys.set(key, apiKey);
    return apiKey;
  }

  async updateApiKeyLastUsed(key: string): Promise<void> {
    const apiKey = this.apiKeys.get(key);
    if (apiKey) {
      apiKey.lastUsedAt = new Date();
    }
  }

  async getApiKeysByPartner(partnerId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter(k => k.partnerId === partnerId);
  }

  // Spin methods
  async createSpin(data: Omit<Spin, 'id' | 'createdAt'>): Promise<Spin> {
    const spin: Spin = {
      ...data,
      id: uuidv4(),
      createdAt: new Date()
    };
    this.spins.set(spin.id, spin);
    return spin;
  }

  async getSpin(id: string): Promise<Spin | null> {
    return this.spins.get(id) || null;
  }

  async updateSpin(id: string, updates: Partial<Spin>): Promise<void> {
    const spin = this.spins.get(id);
    if (spin) {
      Object.assign(spin, updates);
    }
  }

  async getSpinsByPartner(partnerId: string, limit: number = 100): Promise<Spin[]> {
    return Array.from(this.spins.values())
      .filter(s => s.partnerId === partnerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getSpinCount(partnerId: string, since?: Date): Promise<number> {
    return Array.from(this.spins.values())
      .filter(s => s.partnerId === partnerId && (!since || s.createdAt >= since))
      .length;
  }

  // Ledger methods
  async createLedgerEntry(data: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      ...data,
      id: uuidv4(),
      createdAt: new Date()
    };
    this.ledgerEntries.set(entry.id, entry);

    // Update partner balance
    const currentBalance = this.partnerBalances.get(data.partnerId) || 0;
    this.partnerBalances.set(data.partnerId, currentBalance + data.amountCents);

    return entry;
  }

  async getPartnerBalance(partnerId: string): Promise<number> {
    return this.partnerBalances.get(partnerId) || 0;
  }

  async getLedgerEntries(partnerId: string, limit: number = 100): Promise<LedgerEntry[]> {
    return Array.from(this.ledgerEntries.values())
      .filter(e => e.partnerId === partnerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Invoice methods
  async createInvoice(data: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const invoice: Invoice = {
      ...data,
      id: uuidv4(),
      createdAt: new Date()
    };
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async getInvoicesByPartner(partnerId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter(i => i.partnerId === partnerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getOverdueInvoices(partnerId: string): Promise<Invoice[]> {
    const now = new Date();
    return Array.from(this.invoices.values())
      .filter(i => i.partnerId === partnerId && i.status === 'overdue' && i.dueAt < now);
  }

  // Analytics
  async getPartnerAnalytics(partnerId: string, days: number = 30): Promise<{
    totalSpins: number;
    totalRevenue: number;
    avgSpinsPerDay: number;
    spinsByDay: { date: string; count: number }[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const spins = Array.from(this.spins.values())
      .filter(s => s.partnerId === partnerId && s.createdAt >= since);

    const spinsByDay: Record<string, number> = {};
    spins.forEach(spin => {
      const date = spin.createdAt.toISOString().split('T')[0];
      spinsByDay[date] = (spinsByDay[date] || 0) + 1;
    });

    const totalRevenue = spins.reduce((sum, s) => sum + s.feeCents, 0);

    return {
      totalSpins: spins.length,
      totalRevenue,
      avgSpinsPerDay: spins.length / days,
      spinsByDay: Object.entries(spinsByDay).map(([date, count]) => ({ date, count }))
    };
  }

  async disconnect(): Promise<void> {
    // Clear all data
    this.partners.clear();
    this.apiKeys.clear();
    this.spins.clear();
    this.ledgerEntries.clear();
    this.invoices.clear();
    this.partnerBalances.clear();
  }
}
