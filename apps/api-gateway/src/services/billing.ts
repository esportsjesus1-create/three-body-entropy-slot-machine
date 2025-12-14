/**
 * Billing Service
 * 
 * Partner accounting system with real-time balance tracking,
 * automatic billing, and auto-suspend/resume functionality.
 */

import { RedisService } from './redis.js';
import { DatabaseService, Partner, Invoice, LedgerEntry } from './database.js';

const SUSPEND_THRESHOLD_CENTS = -500000; // -$5,000
const OVERDUE_DAYS_THRESHOLD = 7;

export class BillingService {
  private redis: RedisService;
  private database: DatabaseService;

  constructor(redis: RedisService, database: DatabaseService) {
    this.redis = redis;
    this.database = database;

    // Run suspension check every hour
    setInterval(() => this.checkSuspensions(), 60 * 60 * 1000);
  }

  /**
   * Get partner balance (cached in Redis for speed)
   */
  async getBalance(partnerId: string): Promise<number> {
    // Try cache first
    const cached = await this.redis.get(`partner:${partnerId}:balance`);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    // Fall back to database
    const balance = await this.database.getPartnerBalance(partnerId);
    
    // Cache for 60 seconds
    await this.redis.set(`partner:${partnerId}:balance`, balance.toString(), 60);
    
    return balance;
  }

  /**
   * Update partner balance cache
   */
  async updateBalanceCache(partnerId: string, balance: number): Promise<void> {
    await this.redis.set(`partner:${partnerId}:balance`, balance.toString(), 60);
  }

  /**
   * Record a spin fee
   */
  async recordSpinFee(partnerId: string, spinId: string, feeCents: number): Promise<void> {
    await this.database.createLedgerEntry({
      partnerId,
      amountCents: feeCents,
      type: 'spin_fee',
      spinId,
      description: `Spin fee for ${spinId}`
    });

    // Update cache
    const newBalance = await this.database.getPartnerBalance(partnerId);
    await this.updateBalanceCache(partnerId, newBalance);

    // Check if suspension is needed
    await this.checkPartnerSuspension(partnerId);
  }

  /**
   * Record a payment
   */
  async recordPayment(partnerId: string, amountCents: number, externalId: string): Promise<void> {
    await this.database.createLedgerEntry({
      partnerId,
      amountCents: -amountCents, // Negative because it reduces what they owe
      type: 'payment',
      description: `Payment received (${externalId})`
    });

    // Update cache
    const newBalance = await this.database.getPartnerBalance(partnerId);
    await this.updateBalanceCache(partnerId, newBalance);

    // Check if we should resume the partner
    await this.checkPartnerResume(partnerId);
  }

  /**
   * Check if a partner should be suspended
   */
  async checkPartnerSuspension(partnerId: string): Promise<boolean> {
    const balance = await this.getBalance(partnerId);
    const overdueInvoices = await this.database.getOverdueInvoices(partnerId);
    
    // Calculate oldest overdue days
    let oldestOverdueDays = 0;
    if (overdueInvoices.length > 0) {
      const now = new Date();
      const oldestDue = overdueInvoices.reduce((oldest, inv) => 
        inv.dueAt < oldest ? inv.dueAt : oldest, 
        overdueInvoices[0].dueAt
      );
      oldestOverdueDays = Math.floor((now.getTime() - oldestDue.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Suspend if balance < -$5000 AND overdue > 7 days
    if (balance < SUSPEND_THRESHOLD_CENTS && oldestOverdueDays > OVERDUE_DAYS_THRESHOLD) {
      await this.suspendPartner(partnerId);
      return true;
    }

    return false;
  }

  /**
   * Check if a partner should be resumed
   */
  async checkPartnerResume(partnerId: string): Promise<boolean> {
    const partner = await this.database.getPartner(partnerId);
    if (!partner || partner.status !== 'suspended') {
      return false;
    }

    const balance = await this.getBalance(partnerId);
    const overdueInvoices = await this.database.getOverdueInvoices(partnerId);

    // Resume if balance >= -$5000 OR no invoices overdue > 7 days
    let oldestOverdueDays = 0;
    if (overdueInvoices.length > 0) {
      const now = new Date();
      const oldestDue = overdueInvoices.reduce((oldest, inv) => 
        inv.dueAt < oldest ? inv.dueAt : oldest, 
        overdueInvoices[0].dueAt
      );
      oldestOverdueDays = Math.floor((now.getTime() - oldestDue.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (balance >= SUSPEND_THRESHOLD_CENTS || oldestOverdueDays <= OVERDUE_DAYS_THRESHOLD) {
      await this.resumePartner(partnerId);
      return true;
    }

    return false;
  }

  /**
   * Suspend a partner
   */
  async suspendPartner(partnerId: string): Promise<void> {
    await this.database.updatePartnerStatus(partnerId, 'suspended');
    
    // Update cache
    await this.redis.set(`partner:${partnerId}:status`, 'suspended');
    
    console.log(`Partner ${partnerId} suspended due to billing issues`);
    
    // TODO: Send notification email/webhook
  }

  /**
   * Resume a partner
   */
  async resumePartner(partnerId: string): Promise<void> {
    await this.database.updatePartnerStatus(partnerId, 'active');
    
    // Update cache
    await this.redis.set(`partner:${partnerId}:status`, 'active');
    
    console.log(`Partner ${partnerId} resumed after payment`);
    
    // TODO: Send notification email/webhook
  }

  /**
   * Check all partners for suspension
   */
  private async checkSuspensions(): Promise<void> {
    // In a real implementation, this would iterate through all partners
    console.log('Running periodic suspension check...');
  }

  /**
   * Generate invoice for a partner
   */
  async generateInvoice(partnerId: string, periodStart: Date, periodEnd: Date): Promise<Invoice> {
    // Get all spin fees in the period
    const ledgerEntries = await this.database.getLedgerEntries(partnerId, 10000);
    const periodEntries = ledgerEntries.filter(e => 
      e.type === 'spin_fee' && 
      e.createdAt >= periodStart && 
      e.createdAt <= periodEnd
    );

    const totalAmount = periodEntries.reduce((sum, e) => sum + e.amountCents, 0);

    const dueAt = new Date(periodEnd);
    dueAt.setDate(dueAt.getDate() + 30); // Net 30

    const invoice = await this.database.createInvoice({
      partnerId,
      periodStart,
      periodEnd,
      amountCents: totalAmount,
      status: 'pending',
      dueAt
    });

    return invoice;
  }

  /**
   * Get billing summary for a partner
   */
  async getBillingSummary(partnerId: string): Promise<{
    currentBalance: number;
    creditLimit: number;
    availableCredit: number;
    pendingInvoices: Invoice[];
    recentTransactions: LedgerEntry[];
    status: 'healthy' | 'warning' | 'critical';
  }> {
    const partner = await this.database.getPartner(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    const balance = await this.getBalance(partnerId);
    const invoices = await this.database.getInvoicesByPartner(partnerId);
    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue');
    const recentTransactions = await this.database.getLedgerEntries(partnerId, 20);

    const availableCredit = partner.creditLimitCents - balance;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (balance > partner.creditLimitCents * 0.8) {
      status = 'warning';
    }
    if (balance > partner.creditLimitCents || partner.status === 'suspended') {
      status = 'critical';
    }

    return {
      currentBalance: balance,
      creditLimit: partner.creditLimitCents,
      availableCredit,
      pendingInvoices,
      recentTransactions,
      status
    };
  }
}
