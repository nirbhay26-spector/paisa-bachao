// Bank Provider interface and mock implementation
class BankProvider {
  async getAccounts() { throw new Error('Not implemented'); }
  async getBalance(accountId) { throw new Error('Not implemented'); }
  async getTransactions(accountId, from, to) { throw new Error('Not implemented'); }
  async subscribeToUpdates(accountId, callback) { throw new Error('Not implemented'); }
}

module.exports = BankProvider;

