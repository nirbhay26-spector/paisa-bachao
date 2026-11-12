const BankProvider = require('./BankProvider');

// Generates realistic Indian bank transaction data for demo purposes
class MockBankProvider extends BankProvider {
  constructor() {
    super();
    this.accounts = [
      { id: 'mock-savings-1', name: 'SBI Savings Account', type: 'savings', number: 'XXXX1234', ifsc: 'SBIN0001234', balance: 15420.50 },
      { id: 'mock-wallet-1', name: 'Paytm Wallet', type: 'wallet', number: 'wallet-001', balance: 850.00 },
    ];
  }

  async getAccounts() {
    return this.accounts;
  }

  async getBalance(accountId) {
    const account = this.accounts.find(a => a.id === accountId);
    return account ? account.balance : 0;
  }

  async getTransactions(accountId, from, to) {
    const txns = [];
    const now = new Date();
    const startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endDate = to ? new Date(to) : now;

    const merchants = [
      { name: 'Swiggy', category: 'food', minAmt: 100, maxAmt: 600, freq: 8 },
      { name: 'Zomato', category: 'food', minAmt: 120, maxAmt: 800, freq: 6 },
      { name: 'Amazon', category: 'shopping', minAmt: 200, maxAmt: 3000, freq: 3 },
      { name: 'Flipkart', category: 'shopping', minAmt: 300, maxAmt: 5000, freq: 2 },
      { name: 'Uber', category: 'travel', minAmt: 80, maxAmt: 400, freq: 5 },
      { name: 'Rapido', category: 'travel', minAmt: 30, maxAmt: 150, freq: 4 },
      { name: 'Netflix', category: 'subscriptions', minAmt: 199, maxAmt: 199, freq: 1 },
      { name: 'Spotify', category: 'subscriptions', minAmt: 59, maxAmt: 59, freq: 1 },
      { name: 'Jio Recharge', category: 'recharge_bills', minAmt: 239, maxAmt: 599, freq: 1 },
      { name: 'Starbucks', category: 'snacks_cafe', minAmt: 200, maxAmt: 600, freq: 3 },
      { name: 'Chai Point', category: 'snacks_cafe', minAmt: 40, maxAmt: 150, freq: 6 },
      { name: 'BookMyShow', category: 'entertainment', minAmt: 200, maxAmt: 800, freq: 1 },
      { name: 'Apollo Pharmacy', category: 'health', minAmt: 100, maxAmt: 500, freq: 1 },
      { name: 'DMart', category: 'shopping', minAmt: 500, maxAmt: 2500, freq: 2 },
      { name: 'ATM Withdrawal', category: 'other', minAmt: 500, maxAmt: 5000, freq: 3 },
    ];

    // Generate transactions spread across the date range
    const dayRange = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
    let refCounter = 400000000000;

    for (const m of merchants) {
      const count = Math.ceil(m.freq * (dayRange / 30));
      for (let i = 0; i < count; i++) {
        const daysOffset = Math.floor(Math.random() * dayRange);
        const txnDate = new Date(startDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
        if (txnDate > endDate) continue;

        txnDate.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60));
        const amount = Math.round((m.minAmt + Math.random() * (m.maxAmt - m.minAmt)) * 100) / 100;

        txns.push({
          id: `mock-txn-${refCounter++}`,
          date: txnDate.toISOString(),
          amount,
          type: 'debit',
          merchant: m.name,
          category_hint: m.category,
          payment_method: m.name === 'ATM Withdrawal' ? 'cash' : 'upi',
          reference: `UPI${refCounter}`,
          description: `${m.name === 'ATM Withdrawal' ? 'ATM WDL' : `UPI-${m.name}`}-${txnDate.toLocaleDateString('en-IN')}`,
        });
      }
    }

    // Add monthly credits (pocket money / salary on 1st)
    let d = new Date(startDate);
    while (d <= endDate) {
      txns.push({
        id: `mock-credit-${d.getMonth()}-${d.getFullYear()}`,
        date: new Date(d.getFullYear(), d.getMonth(), 1, 10, 0).toISOString(),
        amount: 10000,
        type: 'credit',
        merchant: 'Pocket Money',
        category_hint: 'income',
        payment_method: 'bank',
        reference: `NEFT${refCounter++}`,
        description: 'NEFT-Monthly Allowance',
      });
      d.setMonth(d.getMonth() + 1);
    }

    // Sort by date descending
    txns.sort((a, b) => new Date(b.date) - new Date(a.date));
    return txns;
  }
}

module.exports = MockBankProvider;

