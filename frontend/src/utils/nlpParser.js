import { suggestCategoryAndTag } from '../../../shared/categories.js';

/**
 * Parses natural language financial inputs into structured transaction candidates.
 * Supports English and Romanized Hindi (Hinglish).
 * 
 * Examples:
 * - "250 zomato yesterday upi"
 * - "80 chai today cash"
 * - "500 received from dad"
 * - "299 spotify monthly"
 * - "1200 electricity split with 3 people"
 */
export function parseNaturalLanguageTransaction(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return null;
  }

  const input = rawInput.trim();
  if (!input) return null;

  let remaining = ` ${input.toLowerCase()} `;

  // 1. Detect Income vs Expense
  const incomeRegex = /\b(received|got|credited|income|pocket\s*money|allowance|from\s+dad|from\s+mom|salary|freelance|cashback|refund)\b/i;
  const isIncome = incomeRegex.test(input);

  // 2. Extract Amount
  // Matches: ₹250, 250, 250rs, 250.50, 1.5k, 2k
  let amount = null;
  const kAmountMatch = remaining.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kAmountMatch) {
    amount = Math.round(parseFloat(kAmountMatch[1]) * 1000);
    remaining = remaining.replace(kAmountMatch[0], ' ');
  } else {
    const numMatch = remaining.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr|rupees|bucks)?/i);
    if (numMatch && parseFloat(numMatch[1]) > 0) {
      amount = parseFloat(numMatch[1]);
      remaining = remaining.replace(numMatch[0], ' ');
    }
  }

  // 3. Extract Payment Method
  let payment_method = 'upi'; // Default for Indian youth
  if (/\b(cash|rokda|roked)\b/i.test(remaining)) {
    payment_method = 'cash';
    remaining = remaining.replace(/\b(cash|rokda|roked)\b/gi, ' ');
  } else if (/\b(card|credit|debit|visa|mastercard)\b/i.test(remaining)) {
    payment_method = 'card';
    remaining = remaining.replace(/\b(card|credit|debit|visa|mastercard)\b/gi, ' ');
  } else if (/\b(wallet|paytm\s*wallet|amazon\s*pay)\b/i.test(remaining)) {
    payment_method = 'wallet';
    remaining = remaining.replace(/\b(wallet|paytm\s*wallet|amazon\s*pay)\b/gi, ' ');
  } else if (/\b(upi|gpay|google\s*pay|phonepe|paytm|bhim)\b/i.test(remaining)) {
    payment_method = 'upi';
    remaining = remaining.replace(/\b(upi|gpay|google\s*pay|phonepe|paytm|bhim)\b/gi, ' ');
  }

  // 4. Extract Date / Relative Time
  let date = new Date();
  if (/\b(yesterday|kal)\b/i.test(remaining)) {
    date.setDate(date.getDate() - 1);
    remaining = remaining.replace(/\b(yesterday|kal)\b/gi, ' ');
  } else if (/\b(day\s*before\s*yesterday|parso)\b/i.test(remaining)) {
    date.setDate(date.getDate() - 2);
    remaining = remaining.replace(/\b(day\s*before\s*yesterday|parso)\b/gi, ' ');
  } else if (/\b(today|aaj)\b/i.test(remaining)) {
    remaining = remaining.replace(/\b(today|aaj)\b/gi, ' ');
  }

  // 5. Extract Recurring / Subscriptions
  let is_recurring = false;
  let recurrence_rule = null;
  if (/\b(monthly|har\s*mahine|every\s*month)\b/i.test(remaining)) {
    is_recurring = true;
    recurrence_rule = 'monthly';
    remaining = remaining.replace(/\b(monthly|har\s*mahine|every\s*month)\b/gi, ' ');
  } else if (/\b(weekly|har\s*hafte|every\s*week)\b/i.test(remaining)) {
    is_recurring = true;
    recurrence_rule = 'weekly';
    remaining = remaining.replace(/\b(weekly|har\s*hafte|every\s*week)\b/gi, ' ');
  } else if (/\b(yearly|annual|every\s*year)\b/i.test(remaining)) {
    is_recurring = true;
    recurrence_rule = 'yearly';
    remaining = remaining.replace(/\b(yearly|annual|every\s*year)\b/gi, ' ');
  }

  // 6. Extract Split Bill Details
  let split_info = null;
  const splitMatch = remaining.match(/\bsplit\s*(?:with|among|between)?\s*(\d+)\s*(?:people|persons|friends|roommates|folks)?\b/i);
  if (splitMatch) {
    const people = parseInt(splitMatch[1], 10);
    if (people > 1 && amount) {
      split_info = {
        total_amount: amount,
        num_people: people,
        per_person: Math.round(amount / people)
      };
    }
    remaining = remaining.replace(splitMatch[0], ' ');
  }

  // 7. Clean remaining words to deduce merchant & notes
  // Remove filler tokens
  const cleanTokens = remaining
    .replace(/\b(spent|paid|buy|bought|ate|eat|cost|for|at|on|with|by|to|rupees|rs|paisa|in|from|and|my|the|a|an)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let merchant = '';
  if (cleanTokens.length > 0) {
    // Capitalize first letters of merchant
    merchant = cleanTokens
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // 8. Suggest Category & Tag
  const intel = suggestCategoryAndTag(merchant + ' ' + input);

  return {
    raw_input: input,
    amount: amount || '',
    is_income: isIncome,
    merchant: merchant || (isIncome ? 'Income' : 'Spend'),
    category_id: intel.category,
    tag: intel.tag,
    payment_method,
    date: date.toISOString().slice(0, 10),
    is_recurring,
    recurrence_rule,
    split_info,
    note: input,
    confidence: amount && merchant ? 'high' : amount ? 'medium' : 'low'
  };
}
