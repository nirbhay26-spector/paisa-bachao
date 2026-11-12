const test = require('node:test');
const assert = require('node:assert');
const { parseBankSMS } = require('../src/utils/smsParser');

test('Parses SBI debit SMS accurately', () => {
  const sms = 'Rs.240.00 debited from A/c XX1234 to VPA Swiggy@icici on 12-11-2026 UPI Ref No 402910394857';
  const res = parseBankSMS(sms);
  assert.ok(res);
  assert.strictEqual(res.amount, 240);
  assert.strictEqual(res.bankName, 'SBI');
  assert.strictEqual(res.type, 'debit');
});

test('Parses HDFC debit SMS accurately', () => {
  const sms = 'INR 500.00 has been debited from A/c XX5678 to Zomato UPI Ref 994820194857';
  const res = parseBankSMS(sms);
  assert.ok(res);
  assert.strictEqual(res.amount, 500);
  assert.strictEqual(res.bankName, 'HDFC');
  assert.strictEqual(res.type, 'debit');
});

test('Parses ICICI bank debit SMS accurately', () => {
  const sms = 'Amt Debited: INR 120.00 from A/c XX9012 at Dominos Pizza Ref 882910482910';
  const res = parseBankSMS(sms);
  assert.ok(res);
  assert.strictEqual(res.amount, 120);
  assert.strictEqual(res.bankName, 'ICICI');
  assert.strictEqual(res.type, 'debit');
});

test('Handles non-transaction text safely', () => {
  const sms = 'Your OTP for logging into bank portal is 482910. Do not share with anyone.';
  const res = parseBankSMS(sms);
  assert.strictEqual(res, null);
});

