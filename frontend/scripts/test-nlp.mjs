import assert from 'assert';
import { parseNaturalLanguageTransaction } from '../src/utils/nlpParser.js';

console.log('🧪 Running NLP Parser Test Suite...');

// Case 1: Standard spend with relative date & UPI
const t1 = parseNaturalLanguageTransaction('250 zomato yesterday upi');
assert.strictEqual(t1.amount, 250);
assert.strictEqual(t1.payment_method, 'upi');
assert.strictEqual(t1.category_id, 'food');
assert.strictEqual(t1.tag, 'need');
console.log('  ✔ 1. "250 zomato yesterday upi" -> amount: 250, food, need, upi');

// Case 2: Cash snack spend
const t2 = parseNaturalLanguageTransaction('80 chai today cash');
assert.strictEqual(t2.amount, 80);
assert.strictEqual(t2.payment_method, 'cash');
assert.strictEqual(t2.category_id, 'snacks_cafe');
assert.strictEqual(t2.tag, 'want');
console.log('  ✔ 2. "80 chai today cash" -> amount: 80, snacks_cafe, want, cash');

// Case 3: Income detection
const t3 = parseNaturalLanguageTransaction('500 received from dad');
assert.strictEqual(t3.amount, 500);
assert.strictEqual(t3.is_income, true);
console.log('  ✔ 3. "500 received from dad" -> amount: 500, is_income: true');

// Case 4: Subscription detection
const t4 = parseNaturalLanguageTransaction('299 spotify monthly');
assert.strictEqual(t4.amount, 299);
assert.strictEqual(t4.is_recurring, true);
assert.strictEqual(t4.recurrence_rule, 'monthly');
assert.strictEqual(t4.category_id, 'subscriptions');
assert.strictEqual(t4.tag, 'want');
console.log('  ✔ 4. "299 spotify monthly" -> amount: 299, subscriptions, recurring monthly');

// Case 5: Bill split detection
const t5 = parseNaturalLanguageTransaction('1200 electricity split with 3 people');
assert.strictEqual(t5.amount, 1200);
assert.strictEqual(t5.category_id, 'recharge_bills');
assert.ok(t5.split_info, 'split_info must be populated');
assert.strictEqual(t5.split_info.num_people, 3);
assert.strictEqual(t5.split_info.per_person, 400);
console.log('  ✔ 5. "1200 electricity split with 3 people" -> amount: 1200, 3 people, ₹400/head');

console.log('🎉 All 5 natural-language transaction tests passed!\n');

