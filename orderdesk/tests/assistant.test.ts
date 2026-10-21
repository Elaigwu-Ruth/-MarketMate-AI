import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.ORDERDESK_DB = ':memory:';
const { many } = await import('../src/lib/db');
const { normaliseDraft, validateProposal, localSuggestion, budgetWarning, providerTimeout } = await import('../src/lib/assistant');
import type { Product } from '../src/lib/types';

const catalogue = many<Product>("SELECT * FROM products WHERE vendor_id='circuit'");
const allProducts = many<Product>('SELECT * FROM products');

test('model proposals reject unknown products, duplicates and out-of-range quantities', () => {
  assert.deepEqual(validateProposal({ items: [{ product_id: 'cable', quantity: 2 }] }, catalogue), [{ product_id: 'cable', quantity: 2 }]);
  assert.throws(() => validateProposal({ items: [{ product_id: 'tote', quantity: 1 }] }, catalogue), /Unknown product/);
  assert.throws(() => validateProposal({ items: [{ product_id: 'cable', quantity: 1 }, { product_id: 'cable', quantity: 2 }] }, catalogue), /Duplicate/);
  assert.throws(() => validateProposal({ items: [{ product_id: 'cable', quantity: 0 }] }, catalogue), /Invalid quantity/);
  assert.throws(() => validateProposal({ items: [{ product_id: 'cable', quantity: 100 }] }, catalogue), /Invalid quantity/);
  assert.throws(() => validateProposal({ items: [{ product_id: 'cable', quantity: 1.5 }] }, catalogue), /Invalid quantity/);
  assert.throws(() => validateProposal({ items: 'not an array' }, catalogue), /Invalid AI response/);
  assert.throws(() => validateProposal({ items: Array.from({ length: 31 }, () => ({ product_id: 'cable', quantity: 1 })) }, catalogue), /Invalid AI response/);
  assert.throws(() => validateProposal(null, catalogue), /Invalid AI response/);
});

test('assistant carts drop unavailable products but reject malformed or duplicate input', () => {
  assert.deepEqual(normaliseDraft([{ product_id: 'cable', quantity: 2 }, { product_id: 'not-in-catalogue', quantity: 1 }], catalogue), [{ product_id: 'cable', quantity: 2 }]);
  assert.deepEqual(normaliseDraft(undefined, catalogue), []);
  assert.throws(() => normaliseDraft([{ product_id: 'cable', quantity: 1 }, { product_id: 'cable', quantity: 1 }], catalogue), /Duplicate cart item/);
  assert.throws(() => normaliseDraft([{ product_id: 'cable', quantity: 0 }], catalogue), /Invalid quantity/);
  assert.throws(() => normaliseDraft([null], catalogue), /Invalid current cart/);
  assert.throws(() => normaliseDraft('items', catalogue), /Invalid current cart/);
});

test('local matching understands quantities, corrections, ambiguity and budgets', () => {
  const two = localSuggestion('Two USB-C cables under ₦6,000', catalogue, []);
  assert.deepEqual(two.items, [{ product_id: 'cable', quantity: 2 }]);
  assert.equal(budgetWarning('Two USB-C cables under ₦6,000', two.items, catalogue), '');

  const corrected = localSuggestion('Make it three in total', catalogue, two.items);
  assert.deepEqual(corrected.items, [{ product_id: 'cable', quantity: 3 }]);

  const more = localSuggestion('Add one more', catalogue, corrected.items);
  assert.deepEqual(more.items, [{ product_id: 'cable', quantity: 4 }]);

  const ambiguous = localSuggestion('fresh', allProducts, []);
  assert.deepEqual(ambiguous.items, []);
  assert.match(ambiguous.note, /Several products match/);

  const unknown = localSuggestion('a hoverboard', catalogue, []);
  assert.deepEqual(unknown.items, []);
  assert.match(unknown.note, /name a product/);

  assert.match(budgetWarning('two cables under ₦1,000', two.items, catalogue), /exceeds your stated budget/);
});

test('provider timeout is bounded and falls back to the documented default', () => {
  assert.equal(providerTimeout({ AI_TIMEOUT_MS: '500' }), 1000);
  assert.equal(providerTimeout({ AI_TIMEOUT_MS: '99999' }), 60000);
  assert.equal(providerTimeout({ AI_TIMEOUT_MS: 'not-a-number' }), 12000);
  assert.equal(providerTimeout({}), 12000);
});
