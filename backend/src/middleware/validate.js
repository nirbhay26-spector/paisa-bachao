const validators = require('../../../shared/validators');

function validateExpense(req, res, next) {
  const { amount, payment_method, tag, date } = req.body;

  if (amount !== undefined && !validators.isValidAmount(amount)) {
    return res.status(400).json({ error: 'Please enter a valid amount between ₹1 and ₹1,00,00,000' });
  }

  if (payment_method && !validators.isValidPaymentMethod(payment_method)) {
    return res.status(400).json({ error: 'Invalid payment method. Use upi, cash, card, or wallet' });
  }

  if (tag && !validators.isValidTag(tag)) {
    return res.status(400).json({ error: 'Invalid tag. Use need, want, or savings' });
  }

  if (date && !validators.isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  next();
}

function validateSplitGroup(req, res, next) {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  next();
}

function validateGroupExpense(req, res, next) {
  const { payer_name, amount, description, shares } = req.body;

  if (!payer_name || typeof payer_name !== 'string' || !payer_name.trim()) {
    return res.status(400).json({ error: 'Payer name is required' });
  }

  if (!amount || !validators.isValidAmount(amount)) {
    return res.status(400).json({ error: 'Please enter a valid expense amount' });
  }

  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Description is required' });
  }

  if (!Array.isArray(shares) || shares.length === 0) {
    return res.status(400).json({ error: 'At least one member share is required' });
  }

  for (const s of shares) {
    if (!s.member_name || typeof s.member_name !== 'string') {
      return res.status(400).json({ error: 'Each share must have a member name' });
    }
    const shareAmt = parseFloat(s.share_amount);
    if (isNaN(shareAmt) || shareAmt < 0) {
      return res.status(400).json({ error: 'Share amount must be non-negative' });
    }
  }

  next();
}

function validateGoal(req, res, next) {
  const { name, target_amount, deadline } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Goal name is required' });
  }

  if (!target_amount || !validators.isValidAmount(target_amount)) {
    return res.status(400).json({ error: 'Please enter a valid target amount' });
  }

  if (deadline && !validators.isValidDate(deadline)) {
    return res.status(400).json({ error: 'Invalid deadline date' });
  }

  next();
}

function validateSubscription(req, res, next) {
  const { name, amount, billing_cycle, next_billing_date } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Subscription name is required' });
  }

  if (!amount || !validators.isValidAmount(amount)) {
    return res.status(400).json({ error: 'Please enter a valid subscription amount' });
  }

  if (billing_cycle && !['weekly', 'monthly', 'quarterly', 'yearly'].includes(billing_cycle)) {
    return res.status(400).json({ error: 'Billing cycle must be weekly, monthly, quarterly, or yearly' });
  }

  if (next_billing_date && !validators.isValidDate(next_billing_date)) {
    return res.status(400).json({ error: 'Invalid next billing date' });
  }

  next();
}

module.exports = {
  validateExpense,
  validateSplitGroup,
  validateGroupExpense,
  validateGoal,
  validateSubscription,
};

