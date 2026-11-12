/**
 * Personal Insights and Advice Engine (Strict User-Isolated Logic)
 * Computes:
 * - Rolling 4-week baseline per category (only if >= 14 days of data)
 * - Pacing vs pocket money if < 14 days
 * - Category overspend (>30% above baseline AND >₹200 difference)
 * - Impulse spike detection (>=3 'want' spends within 48h)
 * - Late-night spend detection (orders after 10:00 PM)
 * - Small repeated expenses (chai/coffee/snacks >=4 times in 7 days)
 * - Live daily safe-to-spend number
 */

function calculateDaysUntilNextIncome(incomeFrequency, arrivalDateStr, now = new Date()) {
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (incomeFrequency === 'weekly') {
    // 7 days rolling or next specific weekday
    const daysLeft = 7 - (now.getDay() === 0 ? 7 : now.getDay());
    return Math.max(1, daysLeft);
  }

  if (incomeFrequency === 'irregular') {
    // Days until end of calendar month as default fallback
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    return Math.max(1, daysInMonth - currentDay + 1);
  }

  // Monthly: arrival date is a day of month (e.g. 1 or 15)
  const arrivalDay = parseInt(arrivalDateStr, 10) || 1;
  let nextDate;
  if (currentDay < arrivalDay) {
    nextDate = new Date(currentYear, currentMonth, arrivalDay);
  } else {
    nextDate = new Date(currentYear, currentMonth + 1, arrivalDay);
  }
  const diffTime = nextDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, daysLeft);
}

function computeSafeToSpend(monthlyIncome, monthSpend, daysLeft) {
  const moneyLeft = monthlyIncome - monthSpend;
  if (moneyLeft <= 0) return 0;
  return Math.max(0, Math.round(moneyLeft / daysLeft));
}

function runInsightsEngine(db, userId, lang = 'en') {
  const now = new Date();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return { insights: [], safePerDay: 0, hasBaseline: false };

  const income = user.monthly_income || 0;
  const daysUntilNext = calculateDaysUntilNextIncome(user.income_frequency, user.income_arrival_date, now);

  // Check data span (first transaction to now)
  const firstTxn = db.prepare(`
    SELECT date FROM transactions 
    WHERE user_id = ? AND is_deleted = 0 
    ORDER BY date ASC LIMIT 1
  `).get(userId);

  let daysOfData = 0;
  if (firstTxn) {
    const firstDate = new Date(firstTxn.date);
    daysOfData = Math.max(1, Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const hasBaseline = daysOfData >= 14;

  // Month-to-date spending
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthSpendRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM transactions 
    WHERE user_id = ? AND is_deleted = 0 AND date >= ?
  `).get(userId, currentMonthStart);
  const monthSpend = monthSpendRow.total;
  const moneyLeft = income - monthSpend;
  const safePerDay = computeSafeToSpend(income, monthSpend, daysUntilNext);

  const insights = [];

  // 1. EARLY DAYS PACING (< 14 days of data)
  if (!hasBaseline) {
    if (income > 0) {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthProgressPct = Math.round((now.getDate() / daysInMonth) * 100);
      const spendProgressPct = Math.round((monthSpend / income) * 100);

      insights.push({
        type: 'pacing',
        icon: spendProgressPct > monthProgressPct ? '⚠️' : '🌱',
        title: 'Pocket Money Pacing',
        observation: `You've used ${spendProgressPct}% of your pocket money in ${monthProgressPct}% of the month.`,
        reason: hasBaseline
          ? 'Track a bit more to establish your personalized baseline.'
          : `Building your baseline (${daysOfData}/14 days recorded).`,
        action: spendProgressPct > monthProgressPct
          ? `Try to keep daily spend around ₹${safePerDay} until your next allowance.`
          : 'Great pacing! You are on track to have savings left over.',
        difference: 0
      });
    }
  }

  // 2. OVERSPEND DETECTION (Requires >= 14 days baseline)
  if (hasBaseline) {
    // 4-week window prior to this week
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const categories = db.prepare(`SELECT id, name FROM categories WHERE user_id = ?`).all(userId);

    for (const cat of categories) {
      // Past 4 weeks baseline per week
      const baselineRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM transactions
        WHERE user_id = ? AND category_id = ? AND is_deleted = 0
          AND date >= ? AND date < ?
      `).get(userId, cat.id, fourWeeksAgo, oneWeekAgo);

      const weeklyBaseline = (baselineRow.total / 3) || 0; // average of previous weeks

      // This week's spend
      const thisWeekRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND category_id = ? AND is_deleted = 0
          AND date >= ?
      `).get(userId, cat.id, oneWeekAgo);

      const thisWeekSpend = thisWeekRow.total;
      const difference = thisWeekSpend - weeklyBaseline;

      // Rule: >30% above baseline AND >₹200 difference
      if (weeklyBaseline > 0 && thisWeekSpend > weeklyBaseline * 1.3 && difference >= 200) {
        // Fetch top 3 culprit transactions
        const topTxns = db.prepare(`
          SELECT amount, merchant, note, date
          FROM transactions
          WHERE user_id = ? AND category_id = ? AND is_deleted = 0 AND date >= ?
          ORDER BY amount DESC LIMIT 3
        `).all(userId, cat.id, oneWeekAgo);

        const topTxnNames = topTxns.map(t => `${t.merchant || t.note || 'Spend'} (₹${Math.round(t.amount)})`).join(', ');

        insights.push({
          type: 'overspend',
          icon: '📈',
          category: cat.name,
          title: `${cat.name} Spike`,
          observation: `${cat.name} was ₹${Math.round(thisWeekSpend)} this week vs your usual ₹${Math.round(weeklyBaseline)}.`,
          reason: topTxnNames ? `Main contributors: ${topTxnNames}.` : `Spent ₹${Math.round(difference)} above your 4-week average.`,
          action: `Consider easing up on ${cat.name} for the next few days to save about ₹${Math.round(difference)}.`,
          difference: Math.round(difference),
          topTransactions: topTxns
        });
      }
    }
  }

  // 3. LATE-NIGHT SPENDING DETECTION (After 10:00 PM in the last 14 days)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const recentSpends = db.prepare(`
    SELECT * FROM transactions
    WHERE user_id = ? AND is_deleted = 0 AND date >= ?
    ORDER BY date DESC
  `).all(userId, fourteenDaysAgo);

  const lateNightSpends = recentSpends.filter(txn => {
    try {
      const h = new Date(txn.date).getHours();
      return h >= 22 || h < 4; // 10 PM to 4 AM
    } catch {
      return false;
    }
  });

  if (lateNightSpends.length >= 3) {
    const lateTotal = lateNightSpends.reduce((s, t) => s + t.amount, 0);
    insights.push({
      type: 'late_night',
      icon: '🌙',
      title: 'Late Night Cravings',
      observation: `You had ${lateNightSpends.length} orders after 10 PM recently totaling ₹${Math.round(lateTotal)}.`,
      reason: 'Late night food and impulse buys often cost 25-40% more due to delivery and surge fees.',
      action: 'Try planning snacks beforehand or setting a 10 PM limit to save ₹300-500 this week.',
      difference: Math.round(lateTotal)
    });
  }

  // 4. IMPULSE SPIKE DETECTION (>= 3 "want" purchases in last 48 hours)
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const recentWants = db.prepare(`
    SELECT * FROM transactions
    WHERE user_id = ? AND is_deleted = 0 AND tag = 'want' AND date >= ?
  `).all(userId, fortyEightHoursAgo);

  if (recentWants.length >= 3) {
    const wantTotal = recentWants.reduce((s, t) => s + t.amount, 0);
    insights.push({
      type: 'impulse',
      icon: '⚡',
      title: 'Impulse Cluster',
      observation: `${recentWants.length} "want" purchases in the last 48 hours totaling ₹${Math.round(wantTotal)}.`,
      reason: 'Multiple treat purchases back-to-back quickly eat up your safe-to-spend buffer.',
      action: 'Try the 24-hour rule for non-essential buys: wait a day before ordering to see if you still want it.',
      difference: Math.round(wantTotal)
    });
  }

  // 5. SMALL REPEATED CHAI/SNACKS (>= 4 spends under ₹100 in 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const microSpends = db.prepare(`
    SELECT * FROM transactions
    WHERE user_id = ? AND is_deleted = 0 AND amount <= 120 AND date >= ?
  `).all(userId, sevenDaysAgo);

  if (microSpends.length >= 4) {
    const microTotal = microSpends.reduce((s, t) => s + t.amount, 0);
    insights.push({
      type: 'chai_repeat',
      icon: '☕',
      title: 'Small Sips Add Up',
      observation: `${microSpends.length} small spends (under ₹120) added up to ₹${Math.round(microTotal)} this week.`,
      reason: 'Small daily chai and canteen treats feel negligible in the moment but form a major slice of weekly spend.',
      action: 'Keep enjoying your chai, but tracking them daily keeps surprises away!',
      difference: Math.round(microTotal)
    });
  }

  // 6. RUNOUT WARNING
  if (income > 0 && moneyLeft <= 0 && daysUntilNext > 0) {
    insights.push({
      type: 'runout',
      icon: '🚨',
      title: 'Pocket Money Depleted',
      observation: `You have ₹0 left with ${daysUntilNext} day(s) until your next allowance date.`,
      reason: 'Spending ran ahead of the calendar cycle.',
      action: 'Switch to zero-spend days or free campus hangout spots until reload day!',
      difference: Math.abs(Math.round(moneyLeft))
    });
  }

  return {
    insights,
    safePerDay,
    hasBaseline,
    daysOfData,
    daysUntilNext,
    moneyLeft,
    monthSpend,
    monthlyIncome: income
  };
}

module.exports = {
  calculateDaysUntilNextIncome,
  computeSafeToSpend,
  runInsightsEngine
};

