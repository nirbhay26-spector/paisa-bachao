const test = require('node:test');
const assert = require('node:assert');
const validators = require('../../shared/validators');

test('Validates positive expense amounts', () => {
  assert.strictEqual(validators.isValidAmount(100), true);
  assert.strictEqual(validators.isValidAmount('250.50'), true);
  assert.strictEqual(validators.isValidAmount(-50), false);
  assert.strictEqual(validators.isValidAmount(0), false);
  assert.strictEqual(validators.isValidAmount('invalid'), false);
});

test('Validates email formatting', () => {
  assert.strictEqual(validators.isValidEmail('student@college.edu'), true);
  assert.strictEqual(validators.isValidEmail('not-an-email'), false);
});

test('Validates 4-digit PIN', () => {
  assert.strictEqual(validators.isValidPin('1234'), true);
  assert.strictEqual(validators.isValidPin('123'), false);
  assert.strictEqual(validators.isValidPin('abcd'), false);
});

test('Validates 50/30/20 expense tags', () => {
  assert.strictEqual(validators.isValidTag('need'), true);
  assert.strictEqual(validators.isValidTag('want'), true);
  assert.strictEqual(validators.isValidTag('savings'), true);
  assert.strictEqual(validators.isValidTag('random'), false);
});

