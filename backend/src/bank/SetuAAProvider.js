const BankProvider = require('./BankProvider');

/**
 * Setu Account Aggregator Provider (Sandbox)
 *
 * To use this provider:
 * 1. Sign up at https://setu.co and get sandbox credentials
 * 2. Set environment variables:
 *    - SETU_CLIENT_ID
 *    - SETU_CLIENT_SECRET
 *    - SETU_AA_BASE_URL (default: https://fiu-sandbox.setu.co)
 * 3. Set BANK_PROVIDER=setu in .env
 *
 * This requires network access and valid sandbox credentials.
 * See docs: https://docs.setu.co/data/account-aggregator
 */
class SetuAAProvider extends BankProvider {
  constructor() {
    super();
    this.baseUrl = process.env.SETU_AA_BASE_URL || 'https://fiu-sandbox.setu.co';
    this.clientId = process.env.SETU_CLIENT_ID;
    this.clientSecret = process.env.SETU_CLIENT_SECRET;
    if (!this.clientId || !this.clientSecret) {
      console.warn('SetuAAProvider: Missing SETU_CLIENT_ID or SETU_CLIENT_SECRET. Provider will not work.');
    }
  }

  async _getHeaders() {
    // In production, implement OAuth token refresh
    return {
      'x-client-id': this.clientId,
      'x-client-secret': this.clientSecret,
      'Content-Type': 'application/json',
    };
  }

  async getAccounts() {
    // Requires active consent. In sandbox, create a consent first.
    console.log('SetuAAProvider.getAccounts() — requires consent flow implementation');
    throw new Error('Setu AA integration requires consent setup. See README for sandbox instructions.');
  }

  async getBalance(accountId) {
    console.log(`SetuAAProvider.getBalance(${accountId}) — requires FI data fetch`);
    throw new Error('Not yet implemented. See Setu docs for FI data fetch.');
  }

  async getTransactions(accountId, from, to) {
    console.log(`SetuAAProvider.getTransactions(${accountId}, ${from}, ${to})`);
    throw new Error('Not yet implemented. See Setu docs for FI data fetch.');
  }
}

module.exports = SetuAAProvider;

